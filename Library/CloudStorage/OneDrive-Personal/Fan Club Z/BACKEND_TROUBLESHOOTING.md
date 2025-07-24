# BACKEND TROUBLESHOOTING GUIDE

## Quick Start Options

Try these in order:

### Option 1: Simple Start (Recommended)
```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"
chmod +x simple-backend.sh
./simple-backend.sh
```

### Option 2: Detailed Diagnostics
```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z"
chmod +x diagnose-backend.sh
./diagnose-backend.sh
```

### Option 3: Manual Start
```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/server"
PORT=5001 npm run dev
```

## Common Issues & Solutions

### Issue 1: "tsx command not found"
**Solution:**
```bash
cd server
npm install tsx --save-dev
# or globally:
npm install -g tsx
```

### Issue 2: "Cannot find module" errors
**Solution:**
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

### Issue 3: Database connection errors
**Check your .env file has:**
```bash
DATABASE_URL=postgresql://postgres.rancdgutigsuapxzwolr:ZXCVbnm,@13579@aws-0-us-east-2.pooler.supabase.com:6543/postgres
```

### Issue 4: Port already in use
**Solution:**
```bash
# Kill processes on port 5001
lsof -ti:5001 | xargs kill -9
# or try a different port
PORT=5002 npm run dev
```

### Issue 5: Environment variables not loading
**Check your server/.env file contains:**
```bash
NODE_ENV=development
PORT=5001
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres.rancdgutigsuapxzwolr:ZXCVbnm,@13579@aws-0-us-east-2.pooler.supabase.com:6543/postgres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key-change-this-in-production
CORS_ORIGINS=http://172.20.2.210:3000,http://localhost:3000
```

## Testing Backend Connection

Once started, test these URLs:

### Health Check
```bash
curl http://172.20.2.210:5001/health
```

### Root Endpoint  
```bash
curl http://172.20.2.210:5001/
```

### API Health
```bash
curl http://172.20.2.210:5001/api/health
```

## Expected Successful Output

When backend starts successfully, you should see:
```
🚀 Server running on port 5001
📱 Local: http://localhost:5001
📱 Network: http://172.20.2.210:5001
📱 Client URL: http://172.20.2.210:3000
✅ Database connection successful
```

## If Nothing Works

### Nuclear Option - Fresh Start:
```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/server"

# Backup current state
cp .env .env.backup

# Clean everything
rm -rf node_modules package-lock.json dist

# Reinstall everything
npm install

# Try starting
PORT=5001 npm run dev
```

### Minimal Test Server:
If the main server won't start, create a test file:

```bash
cd server
cat > test-server.js << 'EOF'
const express = require('express');
const app = express();
const port = 5001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server running' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
  console.log(`http://172.20.2.210:${port}/health`);
});
EOF

node test-server.js
```

## Next Steps

1. **Try the simple-backend.sh script first**
2. **If that fails, run diagnose-backend.sh for detailed info**
3. **Check the console output for specific error messages**
4. **Test the health endpoint once it's running**
5. **Then try the frontend login again**

Let me know what specific error messages you get!
