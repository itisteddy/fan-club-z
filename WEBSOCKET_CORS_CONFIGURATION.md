# WebSocket CORS Configuration Guide for Fan Club Z

## 🚀 Quick Configuration Checklist

### ✅ Current Status
Based on your setup, the WebSocket CORS is **already properly configured** in the code. Here's what needs to be verified:

## 🔧 Environment Variables Configuration

### 1. **Check Your Environment Variables**

Make sure these are set in your `.env.local` file:

```bash
# Production Frontend URLs
VITE_APP_URL=https://fanclubz.app
CLIENT_URL=https://fanclubz.app
FRONTEND_URL=https://fanclubz.app

# Development URLs (if running locally)
# VITE_APP_URL=http://localhost:5173
# CLIENT_URL=http://localhost:5173
# FRONTEND_URL=http://localhost:5173

# API Configuration
API_URL=https://your-api-domain.com
PORT=3001

# WebSocket specific
ENABLE_WEBSOCKET=true
WEBSOCKET_PORT=3002
WEBSOCKET_ORIGINS=https://fanclubz.app,https://dev.fanclubz.app,http://localhost:5173
```

### 2. **Current CORS Origins Configuration**

The system is configured to allow these origins:

**Production:**
- https://fanclubz.app
- https://www.fanclubz.app
- https://app.fanclubz.app
- https://dev.fanclubz.app
- https://fan-club-z-pw49foj6y-teddys-projects-d67ab22a.vercel.app
- Any `.vercel.app` domain (for deployments)

**Development:**
- http://localhost:3000
- http://localhost:5173
- https://dev.fanclubz.app
- Any origin (in development mode)

## 🛠️ Infrastructure Configuration

### 3. **Server Configuration (Express + Socket.IO)**

#### Express CORS (Already Configured ✅)
```javascript
// In app.ts - HTTP CORS
app.use(cors({
  origin: function (origin, callback) {
    // Dynamic origin checking with fallbacks
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
```

#### Socket.IO CORS (Already Configured ✅)
```javascript
// In ChatService.ts - WebSocket CORS
this.io = new Server(this.httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});
```

#### Helmet Security Headers (Already Configured ✅)
```javascript
// WebSocket connections allowed in CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      connectSrc: ["'self'", "ws:", "wss:"], // ✅ WebSocket allowed
    },
  },
}));
```

## 🌐 Deployment Platform Configuration

### 4. **Vercel Configuration**

If deploying to Vercel, ensure your `vercel.json` includes:

```json
{
  "functions": {
    "server/src/index.ts": {
      "maxDuration": 10
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server/src/index.ts"
    },
    {
      "source": "/socket.io/(.*)",
      "destination": "/server/src/index.ts"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization, X-Requested-With"
        }
      ]
    }
  ]
}
```

### 5. **Railway/Render Configuration**

If using Railway or Render, ensure:

- **Port Configuration**: Use `process.env.PORT` (already configured ✅)
- **WebSocket Support**: Enabled in platform settings
- **Environment Variables**: All URLs and origins set correctly

## 🧪 Testing WebSocket Connectivity

### 6. **Connection Testing Script**

Create this test to verify WebSocket connections:

```javascript
// Test in browser console
const socket = io('https://your-api-domain.com', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ WebSocket Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ WebSocket Connection Error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 WebSocket Disconnected:', reason);
});
```

### 7. **Browser Network Testing**

1. Open your deployed app
2. Open browser DevTools → Network tab
3. Filter by "WS" (WebSocket)
4. Look for Socket.IO connections
5. Verify status is "101 Switching Protocols"

## 🚨 Common Issues & Solutions

### Issue 1: CORS Error in Browser Console
```
Access to XMLHttpRequest at 'https://api-domain.com/socket.io/?EIO=4...' 
from origin 'https://your-frontend.com' has been blocked by CORS policy
```

**Solution:** Add your frontend domain to the allowed origins list.

### Issue 2: WebSocket Connection Fails
```javascript
// If seeing polling instead of websocket
socket.on('connect', () => {
  console.log('Transport:', socket.io.engine.transport.name); // Should be 'websocket'
});
```

**Solution:** Ensure your hosting platform supports WebSocket upgrades.

### Issue 3: Development vs Production URLs
Make sure environment variables match your deployment:

```bash
# Development
VITE_API_URL=http://localhost:3001

# Production  
VITE_API_URL=https://your-api-domain.com
```

## 🔍 Debugging Commands

### Check Current Configuration
```bash
# In your project directory
echo "Frontend URL: $VITE_APP_URL"
echo "API URL: $API_URL"
echo "Node Environment: $NODE_ENV"
```

### Test Socket.IO Endpoint
```bash
# Test if Socket.IO endpoint is accessible
curl -i "https://your-api-domain.com/socket.io/?EIO=4&transport=polling"
```

## ✅ Verification Steps

1. **Environment Variables Set** ✅
2. **CORS Origins Include Your Domain** ✅  
3. **WebSocket Transports Enabled** ✅
4. **Helmet Allows WebSocket Connections** ✅
5. **Platform Supports WebSocket** (Verify with your hosting provider)
6. **SSL Certificate Valid** (Required for wss:// connections)

## 🎯 Your Current Status

Based on your code review:
- ✅ **Express CORS**: Properly configured with dynamic origin checking
- ✅ **Socket.IO CORS**: Correctly set up with allowed origins
- ✅ **Security Headers**: WebSocket connections allowed in CSP
- ✅ **Connection Management**: Proper authentication and room handling
- ✅ **Error Handling**: Comprehensive error catching and logging

The WebSocket CORS configuration is **already properly implemented**. If you're experiencing connection issues, they're likely related to:

1. **Environment variables** not matching your deployment URLs
2. **Hosting platform** WebSocket support
3. **SSL/HTTPS** configuration for secure WebSocket connections

Check your deployment logs for any CORS-related errors and ensure your environment variables match your actual domain names.
