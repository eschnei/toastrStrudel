# Toastr Strudel API Server

Backend API proxy for secure API key handling in production.

## Overview

This server acts as a proxy between the Toastr Strudel frontend and the OpenAI API. It keeps the API key server-side only, preventing exposure in client-side code.

## Features

- **Secure API Key Storage**: API key stored server-side only
- **Rate Limiting**: 30 requests per minute per IP
- **CORS Configuration**: Controlled cross-origin access
- **Request Validation**: Input sanitization and validation
- **Security Headers**: Helmet.js security headers
- **Error Handling**: Graceful error responses

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-api-key-here
PORT=3001
FRONTEND_URL=https://your-app.example.com
NODE_ENV=development
```

### 3. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## API Endpoints

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-24T10:30:00.000Z",
  "version": "1.0.0"
}
```

### GET /api/claude/status

Check if the OpenAI API is available.

**Response:**
```json
{
  "status": "available",
  "model": "gpt-4o-mini"
}
```

### POST /api/claude/messages

Generate an OpenAI response. This is the main proxy endpoint.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "Create a chill beat" }
  ],
  "system": "You are a music pattern generator...",
  "max_tokens": 1024,
  "temperature": 0.8,
  "model": "gpt-4o"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| messages | array | Yes | Conversation messages |
| system | string | No | System prompt |
| max_tokens | number | No | Max response tokens (1-4096, default: 1024) |
| temperature | number | No | Creativity (0-2, default: 0.8) |
| model | string | No | Model ID (default: gpt-4o) |

**Response:**
```json
{
  "id": "chatcmpl-...",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "stack(s(\"bd sd\")...)" }
  ],
  "model": "gpt-4o",
  "stop_reason": "stop",
  "usage": {
    "input_tokens": 150,
    "output_tokens": 200
  }
}
```

## Rate Limiting

The API enforces a rate limit of **30 requests per minute per IP address**.

When exceeded, you'll receive:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again in a minute."
}
```

## CORS Configuration

By default, the following origins are allowed:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:4173` (Vite preview)
- Custom `FRONTEND_URL` from environment

Add additional origins in the `ALLOWED_ORIGINS` array in `index.js`.

## Frontend Integration

### Using the Proxy Client

Copy `client.ts` to your frontend:

```typescript
import { createProxyMessage } from './client'

// Make requests through the proxy
const response = await createProxyMessage({
  messages: [{ role: 'user', content: 'chill vibes' }],
  system: PATTERN_AGENT_SYSTEM_PROMPT,
  temperature: 0.8,
})

console.log(response.content[0].text)
```

### Configuration

Set the API URL in your frontend:

```env
# .env (frontend)
VITE_API_URL=http://localhost:3001
```

Or in production:
```env
VITE_API_URL=https://api.your-domain.com
```

## Production Deployment

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| OPENAI_API_KEY | Your OpenAI API key | Yes |
| PORT | Server port (default: 3001) | No |
| FRONTEND_URL | Production frontend URL for CORS | Yes |
| NODE_ENV | Environment (production) | Yes |

### Running with PM2

```bash
# Install PM2
npm install -g pm2

# Start the server
pm2 start index.js --name toastr-strudel-api

# Save PM2 configuration
pm2 save
pm2 startup
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

### Reverse Proxy (Nginx)

```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
}
```

## Security Considerations

1. **Never expose API key in frontend code**: Always use the proxy in production
2. **HTTPS Required**: Use HTTPS in production for secure communication
3. **Rate Limiting**: Adjust rate limits based on your expected traffic
4. **Monitoring**: Monitor for unusual request patterns
5. **API Key Rotation**: Rotate API keys periodically

## Allowed Models

For cost control, only these models are allowed:
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`

Modify the `allowedModels` array in `index.js` to change this list.

## Troubleshooting

### API Key Not Working

- Verify the key is valid at platform.openai.com
- Check the key is correctly set in `.env`
- Restart the server after changing `.env`

### CORS Errors

- Add your frontend origin to `ALLOWED_ORIGINS`
- Check the frontend is using the correct API URL
- Verify credentials mode is set correctly

### Rate Limit Issues

- Implement client-side request queuing
- Consider increasing the limit for trusted origins
- Add request caching where appropriate
