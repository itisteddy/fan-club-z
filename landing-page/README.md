# Landing Page Project

This is the separate marketing landing page project deployed to Vercel.

## Vercel Project
- **Project Name:** landing-page
- **Project ID:** prj_ksSZhiJjGoOD9PxbursfWNZ9zZ2U
- **Organization:** teddys-projects-d67ab22a
- **Production URL:** https://fanclubz.app
- **Build Command:** `VITE_BUILD_TARGET=landing npm run build`
- **Root Directory:** Points to `../client` (main client directory)

## How It Works

The landing page is built from the main `client/` directory using the `VITE_BUILD_TARGET=landing` environment variable. The source files are in the main client project, not in this directory.

This directory (`landing-page/`) only contains:
- Vercel project configuration (`.vercel/`)
- Environment variables (`.env.local`)
- Package dependencies (`package.json`)

## Local Testing

### Option 1: Using Vercel CLI (Recommended)
```bash
cd landing-page
vercel dev
```
This will use Vercel's dev server and simulate the production build.

### Option 2: Direct Vite Dev Server
```bash
cd client
VITE_BUILD_TARGET=landing npm run dev
```

### Option 3: Build and Preview
```bash
cd client
VITE_BUILD_TARGET=landing npm run build
npm run preview
```

## APK Download

The landing page should reference the APK from the main app:
- **APK URL:** `https://app.fanclubz.app/downloads/app-latest.apk`
- **Current Version:** 2.0.78
- **Size:** 4.9 MB (5,095,184 bytes)
- **SHA-256:** `69c0cbffb196057cda2c6d82ba9c83c8f298fd1466128eaa69ebd30ce400a87d`
- **Checksums:** `https://app.fanclubz.app/downloads/checksums.json`

## Next Steps

1. ✅ Landing page moved to root level (`landing-page/`)
2. ⏳ Test locally using `vercel dev` or `VITE_BUILD_TARGET=landing npm run dev`
3. ⏳ Update landing page source files (in `client/`) to reference APK version 2.0.78
4. ⏳ Deploy when ready

## File Structure

```
FanClubZ-version2.0/
├── client/              # Main app (contains landing page source files)
│   ├── src/            # Source files including landing page
│   └── public/         # Static assets including APK
│       └── downloads/
│           ├── app-latest.apk
│           └── checksums.json
└── landing-page/       # Vercel project configuration only
    ├── .vercel/        # Vercel project config
    └── package.json    # Dependencies
```

