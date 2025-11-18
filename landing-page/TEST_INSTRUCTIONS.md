# Testing the Landing Page Locally

## The Issue
Vercel dev might be stuck because it needs to:
1. Detect the framework
2. Set up the build environment
3. Point to the correct source directory

## Solution: Use Direct Vite Dev (Simpler)

Since the landing page builds from the `client/` directory, the easiest way to test is:

```bash
cd client
VITE_BUILD_TARGET=landing npm run dev
```

This will start the Vite dev server with the landing page target, and you can access it at `http://localhost:5174` (or the port shown).

## Alternative: Vercel Dev (More Complex)

If you want to use `vercel dev` to simulate production:

1. **Option A: Run from client directory**
   ```bash
   cd client
   vercel dev --cwd . --yes
   ```

2. **Option B: Run from landing-page with correct config**
   ```bash
   cd landing-page
   vercel dev --cwd ../client --yes
   ```

The `--yes` flag should auto-accept prompts, but if it still gets stuck, you might need to run it interactively first to set up the project link.

## Quick Test Command

Run this to start the dev server:
```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0/client" && VITE_BUILD_TARGET=landing npm run dev
```

Then open your browser to the URL shown (usually `http://localhost:5174`)

