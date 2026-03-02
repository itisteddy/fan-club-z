# Start Development Servers

## Problem
Your frontend at `localhost:5174` is trying to connect to the backend at `localhost:3001`, but the backend server is not running, causing `ERR_CONNECTION_REFUSED` errors.

## Solution

You need to run **BOTH** the frontend and backend servers simultaneously.

### Option 1: Run Both in Same Terminal (Recommended for Quick Start)
```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

# Start both servers (server runs on port 3001, client on 5174)
npm run dev & cd client && npm run dev
```

### Option 2: Run in Separate Terminals (Recommended for Development)

**Terminal 1 - Backend Server:**
```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"
npm run dev
```

**Terminal 2 - Frontend Client:**
```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0/client"
npm run dev
```

### Verify Servers Are Running

1. **Backend** should be accessible at: http://localhost:3001
   - Test with: `curl http://localhost:3001/api/health`
   
2. **Frontend** should be accessible at: http://localhost:5174
   - Open in browser

### Common Issues

1. **Port 3001 already in use**
   ```bash
   # Find and kill the process using port 3001
   lsof -ti:3001 | xargs kill -9
   ```

2. **Port 5174 already in use**
   ```bash
   # Find and kill the process using port 5174
   lsof -ti:5174 | xargs kill -9
   ```

3. **Database connection issues**
   - Check that your `.env` file in the server directory has valid Supabase credentials
   - Verify server/.env has:
     - `DATABASE_URL`
     - `DIRECT_URL` (for Prisma migrations)
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`

### Expected Console Output

When running correctly, you should see:
- **Backend**: `Server started on port 3001`
- **Frontend**: `Local: http://localhost:5174`

No more `ERR_CONNECTION_REFUSED` errors!
