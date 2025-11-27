# Landing Page Deployment Guide

## Critical Configuration

The landing page is a **separate Vercel project** that builds the same codebase but with a different environment variable.

### How It Works

1. **Code Logic**: `client/src/main.tsx` checks `VITE_BUILD_TARGET === 'landing'`:
   ```typescript
   const isLandingBuild = import.meta.env.VITE_BUILD_TARGET === 'landing';
   const RootComponent = isLandingBuild ? LandingPage : App;
   ```

2. **When `VITE_BUILD_TARGET=landing`**: Renders `LandingPage` component (marketing page)
3. **When `VITE_BUILD_TARGET` is unset or different**: Renders `App` component (main application)

### Vercel Project: "landing-page"

**Required Settings:**

1. **Root Directory**: Empty (repo root) - NOT `client`
2. **Build Command**: `cd client && VITE_BUILD_TARGET=landing npm run build`
3. **Install Command**: `npm install` (from repo root)
4. **Output Directory**: `client/dist`
5. **Environment Variable** (CRITICAL): 
   - Key: `VITE_BUILD_TARGET`
   - Value: `landing`
   - Scope: Production, Preview, Development

### Why Environment Variable is Required

Vite environment variables must be available at build time. Setting it only in the build command may not work reliably. It MUST be set as an environment variable in Vercel dashboard.

### Verification

After deployment, check the built `index.html` or JavaScript bundle - it should render `LandingPage` instead of `App`.

### Common Mistakes

1. ❌ Setting Root Directory to `client` - breaks workspace dependencies
2. ❌ Not setting `VITE_BUILD_TARGET` as environment variable - builds main app instead
3. ❌ Using wrong build command - must include `cd client &&`
4. ❌ Deploying to wrong Vercel project - must use "landing-page" project, not "fan-club-z"

### Deployment Steps

1. Ensure `VITE_BUILD_TARGET=landing` is set in Vercel Environment Variables
2. Push to `main` branch (should auto-deploy)
3. OR manually deploy: `vercel --prod --cwd .` (from repo root with landing-page project linked)

