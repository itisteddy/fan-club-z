# Fan Club Z - Environment Configuration Guide

This guide explains how to set up both development and production environments for Fan Club Z with proper WebSocket configuration.

## 🌍 Environment Overview

| Environment | Frontend Domain | Backend Server | Purpose |
|-------------|----------------|----------------|---------|
| **Development** | `dev.fanclubz.app` | `fan-club-z.onrender.com` | Testing new features |
| **Production** | `app.fanclubz.app` | `fan-club-z.onrender.com` | Live user traffic |

## 🔧 WebSocket URL Configuration

### Client-Side URL Detection (chatStore.ts)
The frontend automatically detects the environment based on the domain:

```typescript
// Production domain
if (hostname === 'app.fanclubz.app') {
  return 'https://fan-club-z.onrender.com'; // Production server
}

// Development domain  
if (hostname === 'dev.fanclubz.app') {
  return 'https://fan-club-z.onrender.com'; // Same server, dev branch
}

// Local development
if (hostname === 'localhost') {
  return 'http://localhost:3001'; // Local server
}
```

### Server-Side CORS Configuration (app.ts)
The backend allows connections from both domains:

```typescript
const allowedOrigins = [
  'https://app.fanclubz.app',    // Production
  'https://dev.fanclubz.app',    // Development  
  'https://fan-club-z.onrender.com', // Backend
  // ... other origins
];
```

## 🚀 Deployment Workflow

### Step 1: Test on Development
```bash
# Deploy to development environment
chmod +x deploy-to-dev.sh
./deploy-to-dev.sh
```

This will:
- Deploy to `development` branch
- Trigger Render deployment
- Make changes available at `dev.fanclubz.app`

### Step 2: Verify Development
1. Open https://dev.fanclubz.app
2. Test user registration/login
3. Create or view a prediction
4. Test real-time chat functionality
5. Check browser console for WebSocket connection logs

### Step 3: Deploy to Production (after dev testing)
```bash
# Deploy to production environment
chmod +x deploy-to-production.sh
./deploy-to-production.sh
```

This will:
- Merge `development` into `main`/`production` branch
- Deploy to production servers
- Make changes available at `app.fanclubz.app`

## 🔍 Environment Variables

### Required for Both Environments
Set these in your Render dashboard:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=[your_anon_key]
SUPABASE_SERVICE_ROLE_KEY=[your_service_role_key]

# Security
JWT_SECRET=[your_jwt_secret]

# Environment
NODE_ENV=production
PORT=10000

# CORS (optional, for additional origins)
CORS_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app
WEBSOCKET_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app
```

## 🧪 Testing WebSocket Connections

### Manual Testing Script
```bash
# Test backend health
curl https://fan-club-z.onrender.com/health

# Test WebSocket endpoint
curl https://fan-club-z.onrender.com/ws

# Test Socket.IO health
curl https://fan-club-z.onrender.com/socket.io/health
```

### Browser Console Testing
Open browser dev tools and check for:

```
✅ Success indicators:
🔗 Connected to chat server
🆔 Socket ID: [socket_id]
🔧 Transport: websocket
✅ Authenticated with server

❌ Error indicators:
❌ Connection error: [error_message]
❌ CORS error
❌ WebSocket connection failed
```

## 🔧 Troubleshooting

### Common Issues

#### 1. CORS Errors
**Symptom**: "Not allowed by CORS" in console
**Solution**: Verify domain is in allowed origins list

#### 2. Connection Timeouts
**Symptom**: "Connection timeout" errors
**Solution**: Render free tier limitations - connections may timeout after 15 minutes of inactivity

#### 3. WebSocket Upgrade Failed
**Symptom**: Falls back to polling transport
**Solution**: Usually normal, polling works fine as fallback

#### 4. Authentication Failures
**Symptom**: "Authentication failed" messages
**Solution**: Check Supabase environment variables are set correctly

### Debug Commands

```bash
# Check current git branch
git branch --show-current

# View recent commits
git log --oneline -5

# Check deployment status
git status

# View CORS configuration
grep -A 20 "allowedOrigins" server/src/app.ts

# Test local WebSocket connection
npm run dev # Start local server
# Open http://localhost:5173 and test
```

## 📊 Monitoring

### Development Environment
- Frontend: Monitor at https://dev.fanclubz.app
- Backend: Check Render logs for development branch
- WebSocket: Watch browser console for connection status

### Production Environment  
- Frontend: Monitor at https://app.fanclubz.app
- Backend: Check Render logs for main/production branch
- Analytics: Monitor user engagement and error rates

## 🚨 Emergency Procedures

### Rollback Production
If production deployment has issues:

```bash
# Switch to production branch
git checkout main # or production

# Rollback to previous working commit
git log --oneline -10  # Find last working commit
git reset --hard [commit_hash]
git push origin main --force

# Or revert specific commit
git revert [commit_hash]
git push origin main
```

### Quick Fix Development
For urgent development fixes:

```bash
# Make quick fix
git checkout development
# ... make changes ...
git add .
git commit -m "🔥 HOTFIX: [description]"
git push origin development
```

## 🎯 Success Criteria

### Development Testing Checklist
- [ ] WebSocket connects successfully
- [ ] Real-time messaging works
- [ ] No CORS errors in console
- [ ] Chat history loads correctly
- [ ] Typing indicators function
- [ ] Reconnection works after network interruption

### Production Deployment Checklist
- [ ] All development tests passed
- [ ] Production domain accessible
- [ ] User registration/login works
- [ ] Prediction creation/viewing works
- [ ] Chat functionality stable
- [ ] Mobile responsiveness verified
- [ ] Performance monitoring active

## 📞 Support

If you encounter issues:

1. Check browser console for error messages
2. Verify environment variables in Render dashboard
3. Test on development environment first
4. Review recent git commits for breaking changes
5. Check Render deployment logs for server errors

---

**Next Steps**: Use `deploy-to-dev.sh` to deploy and test, then `deploy-to-production.sh` for production deployment.
