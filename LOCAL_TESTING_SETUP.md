# Local Testing Setup Guide

This guide will help you set up and run the FanClubZ application locally for testing the homepage polish, auth guard, and compliant copy changes.

## Prerequisites

✅ **Node.js**: v22.17.1 (installed)
✅ **npm**: v10.9.2 (installed)

## Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

### Step 2: Set Up Environment Variables

#### Server Environment (`server/.env`)

Create `server/.env` with the following minimum required variables:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Database (if using direct connection)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres

# JWT Secret (for local dev, can be any string)
JWT_SECRET=local-dev-jwt-secret-minimum-32-characters-long

# Frontend URL
CLIENT_URL=http://localhost:5174
```

#### Client Environment (`client/.env.local`)

Create `client/.env.local` with:

```bash
# Build Target - Set to 'landing' for landing page, or remove for main app
VITE_BUILD_TARGET=landing

# Supabase Configuration
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo

# WalletConnect (Optional for local testing)
VITE_WALLETCONNECT_PROJECT_ID=00bf3e007580babfff66bd23c646f3ff

# Base Sepolia Configuration (Optional for local testing)
VITE_USDC_ADDRESS_BASE_SEPOLIA=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_BASE_ESCROW_ADDRESS=your_escrow_address
VITE_FCZ_BASE_BETS=1

# API URL (points to local server)
VITE_API_URL=http://localhost:3001
```

**Important**: Set `VITE_BUILD_TARGET=landing` to view the landing page, or remove it to view the main app.

**Note**: The Supabase keys above are default values. For production, use your own Supabase project credentials.

### Step 3: Start Both Servers

#### Option A: Run in Separate Terminals (Recommended)

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

#### Option B: Run Both in Background

```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"

# Start server in background
npm run dev &

# Start client
cd client && npm run dev
```

## Verify Setup

### 1. Check Backend Server
- **URL**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Expected Response**:
  ```json
  {
    "status": "OK",
    "version": "2.0.78",
    "environment": "development"
  }
  ```

### 2. Check Frontend Client

**For Landing Page:**
- **URL**: http://localhost:5174
- **Requires**: `VITE_BUILD_TARGET=landing` in `client/.env.local`
- Open in browser and verify the landing page loads

**For Main App:**
- **URL**: http://localhost:5174
- **Requires**: Remove or comment out `VITE_BUILD_TARGET` in `client/.env.local`
- Open in browser and verify the main app loads

## Testing the New Features

### 1. Homepage Polish
- ✅ Visit http://localhost:5174
- ✅ Verify hero section is centered (no empty box)
- ✅ Check "Open Web App" and "Download Android APK" buttons
- ✅ Verify social icons are removed under "Open web app"
- ✅ Test APK download button and install instructions toggle
- ✅ Check footer is 1 column on mobile

### 2. OAuth Naming
- ✅ Click any "Sign in" button
- ✅ Verify modal title shows "Sign in to FanClubZ"
- ✅ Check Google SSO button has tooltip
- ✅ Verify footer mentions "FanClubZ's Terms of Service"

### 3. Auth Guard for Create Prediction
- ✅ Navigate to Create Prediction page (while logged out)
- ✅ Fill out the form and click "Create Prediction"
- ✅ Verify auth modal appears
- ✅ Sign in with Google or Email
- ✅ Check "Resume draft?" banner appears
- ✅ Click "Resume" to restore form data
- ✅ Verify form auto-fills with saved draft

### 4. Lexicon Compliance
- ✅ Check navigation shows "Stakes" instead of "My Bets"
- ✅ Verify betting terminology is replaced with compliant terms
- ✅ Check prediction pages use "stake" instead of "bet"

## Troubleshooting

### Port Already in Use

**Port 3001 (Server):**
```bash
lsof -ti:3001 | xargs kill -9
```

**Port 5174 (Client):**
```bash
lsof -ti:5174 | xargs kill -9
```

### Database Connection Issues

1. Verify Supabase credentials in `server/.env`
2. Check network connectivity
3. Verify Supabase project is active

### Missing Logo Asset

The logo file should be placed at:
```
client/public/brand/fcz-logomark.png
```

If missing, the app will fall back to `/icons/icon-96.png`.

### Environment Variables Not Loading

1. Ensure `.env` files are in correct locations:
   - `server/.env` (not `server/.env.local`)
   - `client/.env.local` (not `client/.env`)

2. Restart servers after changing environment variables

### Module Not Found Errors

```bash
# Clean install
rm -rf node_modules client/node_modules server/node_modules
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

## Development URLs

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health
- **API Root**: http://localhost:3001/

## Next Steps

1. ✅ Test all new features listed above
2. ✅ Verify responsive design on mobile
3. ✅ Test auth flow end-to-end
4. ✅ Check lexicon compliance across all pages
5. ✅ Verify logo displays correctly (once PNG is added)

## Quick Commands Reference

```bash
# Install all dependencies
npm install && cd client && npm install && cd .. && cd server && npm install && cd ..

# Start backend only
npm run dev

# Start frontend only
cd client && npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Build for production
npm run build
```

---

**Ready to test!** Start both servers and visit http://localhost:5174 🚀

