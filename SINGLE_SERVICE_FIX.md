# Single Render Service Configuration (Free Tier)

## Situation Analysis
Since you're using Render's free tier with **one service** handling both development and production, the previous recommendation for separate services doesn't apply.

## Current Single Service Setup

Your single Render service needs to:
- Accept connections from both `dev.fanclubz.app` AND `app.fanclubz.app`
- Route WebSocket connections properly based on the origin
- Handle CORS for multiple frontend domains

## ✅ Corrected Environment Variables (Single Service)

Update your **single Render service** environment variables to:

```bash
# Frontend URLs (both dev and prod)
CLIENT_URL=https://app.fanclubz.app
FRONTEND_URL=https://app.fanclubz.app

# CORS Origins (include ALL your domains)
CORS_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app,https://fanclubz.app,https://www.fanclubz.app,https://fan-club-z.onrender.com

# WebSocket Origins (include ALL domains that will connect)
WEBSOCKET_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app,https://fanclubz.app,https://www.fanclubz.app,https://fan-club-z.onrender.com

# Service identification (helps with logging)
RENDER_SERVICE_TYPE=unified
```

## ✅ Code Changes Applied

### 1. Updated Client Configuration
Both `dev.fanclubz.app` and `app.fanclubz.app` now connect to the same service:
- **Service URL**: `https://fan-club-z.onrender.com`
- **Environment Detection**: Properly handles both dev and prod domains
- **Single Service**: Both environments use the same backend

### 2. Updated Server CORS
Server now accepts connections from all your domains:
- `dev.fanclubz.app` (development frontend)
- `app.fanclubz.app` (production frontend)
- `fanclubz.app` (custom domain)
- `fan-club-z.onrender.com` (service URL)

### 3. Simplified WebSocket Configuration
WebSocket service handles all domains through single service:
- No separate dev/prod services needed
- Unified CORS configuration
- Single connection endpoint

## 🚀 Deployment Steps

### Step 1: Update Render Environment Variables
1. Go to Render Dashboard → Your Service → Environment
2. Update these critical variables:
   ```
   CORS_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app,https://fanclubz.app,https://www.fanclubz.app,https://fan-club-z.onrender.com
   WEBSOCKET_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app,https://fanclubz.app,https://fan-club-z.onrender.com
   CLIENT_URL=https://app.fanclubz.app
   FRONTEND_URL=https://app.fanclubz.app
   ```

### Step 2: Deploy Code Changes
```bash
# Run the automated script
chmod +x deploy-single-service-fix.sh
./deploy-single-service-fix.sh

# Or manually:
git add .
git commit -m "fix: WebSocket configuration for single Render service"
git push origin main
```

### Step 3: Verify Deployment
- **Service Health**: https://fan-club-z.onrender.com/health
- **WebSocket Test**: https://fan-club-z.onrender.com/ws
- **Dev Frontend**: https://dev.fanclubz.app
- **Prod Frontend**: https://app.fanclubz.app

## Expected Results

After deployment:

### Development Environment (`dev.fanclubz.app`)
- ✅ Connects to `fan-club-z.onrender.com`
- ✅ WebSocket works properly
- ✅ No CORS errors
- ✅ Real-time chat functions

### Production Environment (`app.fanclubz.app`)
- ✅ Connects to `fan-club-z.onrender.com`
- ✅ WebSocket works properly
- ✅ No CORS errors
- ✅ All real-time features work

## Single Service Architecture

```
Frontends → Single Backend Service

dev.fanclubz.app ─┐
                  ├─→ fan-club-z.onrender.com
app.fanclubz.app ─┘
```

## Why This Solves Your Issue

1. **Correct Service URL**: Both frontends connect to your actual service
2. **Proper CORS**: Server accepts connections from all your domains
3. **Unified Configuration**: Single service handles both environments
4. **No URL Mismatch**: Environment detection works correctly

This configuration is perfect for Render's free tier and will resolve all WebSocket connection issues!
