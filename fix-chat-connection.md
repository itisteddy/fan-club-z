# Chat WebSocket Connection Fix

## Issue
The client is trying to connect to `https://fan-club-z-onrender.com` instead of the local server `http://localhost:3001`.

## Steps to Fix

### 1. Start the Server
```bash
cd server
npm run dev
```

### 2. Verify Environment Variables
The client `.env.local` should have:
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### 3. Test WebSocket Connection
Open browser console and run:
```javascript
// Test basic connection
const socket = io('http://localhost:3001');
socket.on('connect', () => console.log('Connected!'));
socket.on('disconnect', () => console.log('Disconnected'));
```

### 4. Check Server Logs
Server should show:
- `🚀 Fan Club Z Server started on port 3001`
- `💬 WebSocket Chat: Enabled`

### 5. If Still Not Working
1. Check if port 3001 is open: `lsof -i :3001`
2. Try different port in both server and client
3. Restart both server and client

## Testing Chat Functionality

1. Go to any prediction detail page
2. Open browser console
3. Should see successful WebSocket connection logs
4. Try sending a message - should appear without errors

## Common Issues
- Server not running on correct port
- Client environment variables pointing to wrong URL
- CORS issues (already configured in server)
- Firewall blocking local connections
