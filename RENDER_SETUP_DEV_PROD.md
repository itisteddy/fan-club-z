# Render Setup Guide for Dev/Prod WebSocket Configuration

## Overview
This guide configures separate Render services for development and production environments with WebSocket support.

## Services Configuration

### Development Service
- **Service Name**: `fanclubz-dev`
- **Branch**: `development`
- **URL**: `https://fan-club-z-dev.onrender.com`
- **Frontend**: `https://dev.fanclubz.app`
- **Plan**: Free tier

### Production Service  
- **Service Name**: `fanclubz-prod`
- **Branch**: `main`
- **URL**: `https://fan-club-z.onrender.com`
- **Frontend**: `https://app.fanclubz.app`
- **Plan**: Starter (for better performance)

## Setup Steps

### 1. Create Development Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `fanclubz-dev`
   - **Branch**: `development`
   - **Build Command**: `npm install && npm run build:shared && cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free

### 2. Configure Development Environment Variables
Add these environment variables in the Render dashboard:

```env
# Basic Configuration
NODE_ENV=production
PORT=10000
CLIENT_URL=https://dev.fanclubz.app
FRONTEND_URL=https://dev.fanclubz.app

# CORS Configuration
CORS_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app,https://fanclubz.app
WEBSOCKET_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app

# Security
JWT_SECRET=[generate_random_value]

# Supabase (required for chat functionality)
SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your_service_role_key]
SUPABASE_ANON_KEY=[your_anon_key]
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=[your_anon_key]

# Features
ENABLE_WEBSOCKET=true
ENABLE_REAL_TIME=true
```

### 3. Create Production Service
1. Create another web service
2. Configure:
   - **Name**: `fanclubz-prod`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build:shared && cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Starter

### 4. Configure Production Environment Variables
Same as development but with production URLs:

```env
# Basic Configuration
NODE_ENV=production
PORT=10000
CLIENT_URL=https://app.fanclubz.app
FRONTEND_URL=https://app.fanclubz.app

# CORS Configuration
CORS_ORIGINS=https://app.fanclubz.app,https://fanclubz.app,https://www.fanclubz.app
WEBSOCKET_ORIGINS=https://app.fanclubz.app,https://fanclubz.app

# (Same Supabase and security config as dev)
```

## DNS Configuration

### For Cloudflare (if using):
1. Add CNAME records:
   - `dev.fanclubz.app` → `fan-club-z-dev.onrender.com`
   - `app.fanclubz.app` → `fan-club-z.onrender.com`

### Custom Domains in Render:
1. Go to each service settings
2. Add custom domain:
   - Dev service: `dev.fanclubz.app`
   - Prod service: `app.fanclubz.app`

## Testing Workflow

### Development Testing
1. Push changes to `development` branch
2. Wait for Render deployment to complete
3. Test at `https://dev.fanclubz.app`
4. Verify WebSocket connection in browser console
5. Test chat functionality in predictions

### Production Deployment
1. After successful dev testing, merge to `main`
2. Production service auto-deploys
3. Test at `https://app.fanclubz.app`
4. Monitor for any issues

## WebSocket Connection Flow

### Development Flow:
```
dev.fanclubz.app → detects dev domain → connects to fan-club-z-dev.onrender.com
```

### Production Flow:
```
app.fanclubz.app → detects prod domain → connects to fan-club-z.onrender.com
```

## Troubleshooting

### WebSocket Connection Issues:
1. Check browser console for connection logs
2. Verify CORS_ORIGINS includes your frontend domain
3. Ensure Supabase environment variables are set
4. Check Render service logs for CORS errors

### Environment Variable Issues:
1. Verify all required variables are set in Render dashboard
2. Check for typos in URLs and keys
3. Ensure Supabase keys have correct permissions

### Deployment Issues:
1. Check build logs in Render dashboard
2. Verify Node.js version compatibility
3. Ensure all dependencies are properly installed

## Monitoring

### Health Checks:
- Dev: `https://fan-club-z-dev.onrender.com/health`
- Prod: `https://fan-club-z.onrender.com/health`

### WebSocket Test:
- Dev: `https://fan-club-z-dev.onrender.com/ws`
- Prod: `https://fan-club-z.onrender.com/ws`

### Socket.IO Status:
- Dev: `https://fan-club-z-dev.onrender.com/socket.io/health`
- Prod: `https://fan-club-z.onrender.com/socket.io/health`

## Success Indicators

✅ Development service deploys successfully from `development` branch
✅ Production service deploys successfully from `main` branch
✅ WebSocket connections work on both environments
✅ Chat functionality works in predictions
✅ No CORS errors in browser console
✅ Health checks return successful responses

## Notes

- Free tier on Render may have cold starts (30-second delay)
- Consider upgrading to Starter plan for production for better performance
- Monitor Render usage limits on free tier
- WebSocket connections may timeout on free tier after 30 minutes of inactivity
