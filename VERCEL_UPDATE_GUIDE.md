# Vercel Update Guide - Connect to Live Backend

## 🎯 Goal
Connect your Vercel frontend deployment to the live Render backend at `https://fan-club-z.onrender.com`

## ✅ Changes Made

### 1. Updated vercel.json
- Set `VITE_API_URL` to production backend URL
- Added environment variables for production configuration
- Configured WebSocket URL for real-time features

### 2. Created .env.production
- Production-specific environment variables
- Separate from local development settings
- Ready for when you add real Supabase credentials

## 🚀 How to Deploy the Update

### Option 1: Automatic Deploy (Recommended)
1. **Commit the changes**:
   ```bash
   git add .
   git commit -m "Connect frontend to live backend on Render"
   git push origin main
   ```

2. **Vercel will automatically deploy** - Check your Vercel dashboard for the deployment status

### Option 2: Manual Deploy via Vercel CLI
1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   cd /path/to/Fan Club Z v2.0/FanClubZ-version2.0
   vercel --prod
   ```

### Option 3: Redeploy via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find your project: `fanclubz-version-2-0`
3. Go to "Deployments" tab
4. Click "Redeploy" on the latest deployment
5. Make sure "Use existing Build Cache" is **unchecked**

## 🔧 Environment Variables Set

The following environment variables are now configured for production:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://fan-club-z.onrender.com` |
| `VITE_WS_URL` | `wss://fan-club-z.onrender.com` |
| `VITE_ENVIRONMENT` | `production` |
| `VITE_DEBUG` | `false` |

## 🧪 How to Test

1. **Wait for deployment to complete** (usually 2-5 minutes)
2. **Visit your Vercel URL**: `https://fanclubz-version-2-0.vercel.app`
3. **Open browser console** and look for API calls
4. **Check Network tab** - API calls should go to `fan-club-z.onrender.com`
5. **Test functionality**:
   - Browse predictions on Discover page
   - Try to join/leave clubs
   - Check if data loads properly

## 📱 Expected API Endpoints

Your frontend will now call:
- `https://fan-club-z.onrender.com/api/v2/predictions`
- `https://fan-club-z.onrender.com/api/v2/clubs`
- `https://fan-club-z.onrender.com/health`

## 🐛 Troubleshooting

### If deployment fails:
1. Check Vercel deployment logs
2. Verify the build completes successfully
3. Make sure the environment variables are set correctly

### If API calls fail:
1. Check browser console for CORS errors
2. Verify backend is running at `https://fan-club-z.onrender.com/health`
3. Check Network tab for failed requests

### If you need to rollback:
1. Go to Vercel dashboard
2. Find a previous working deployment
3. Click "Promote to Production"

## 🎉 Success Indicators

✅ **Deployment succeeds** - No build errors  
✅ **Frontend loads** - App opens without errors  
✅ **API calls work** - Data loads from live backend  
✅ **No CORS errors** - Browser console is clean  
✅ **Mock data appears** - Predictions and clubs show up  

## 📝 Next Steps After This Works

1. **Test all pages** - Make sure Discover, Clubs work
2. **Add real environment variables** - Supabase credentials when ready
3. **Monitor performance** - Check loading times
4. **User testing** - Get feedback on the live app

Your frontend should now be fully connected to the live backend! 🚀
