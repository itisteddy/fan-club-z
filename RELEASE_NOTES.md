# Release Notes - v2.0.78

**Release Date:** November 15, 2025  
**Release Branch:** `release/v2.0.78`  
**Stable Snapshot Tag:** `dev-stable-20251114-2246`

## 🚀 What's New

### Production Deployment
- Automated production deployment pipeline via GitHub Actions
- Vercel production deployment with prebuilt artifacts
- Health endpoint verification and post-deploy checks

### Android APK Release
- Android APK build remains powered by Bubblewrap (Trusted Web Activity)
- APK available for download at `/downloads/app-latest.apk`
- Dedicated download page at `/download`
- SHA-256 checksum verification for APK integrity
- Installation instructions and security information
- APK versioning is now read directly from `package.json` to avoid hardcoding

### Infrastructure
- GitHub Actions CI/CD workflow for automated releases
- Automated APK generation and deployment
- Version management across all packages (root, client, server, shared)

## 📦 Deliverables

### Files Added
- `client/scripts/build-apk.sh` - Android APK build script
- `client/src/pages/DownloadPage.tsx` - Download page component
- `.github/workflows/release.yml` - CI/CD release workflow
- `client/public/downloads/` - Downloads directory with checksums
- `RELEASE_NOTES.md` - This file

### Files Modified
- `package.json` - Version bumped to 2.0.78
- `client/package.json` - Version bumped to 2.0.78
- `server/package.json` - Version bumped to 2.0.78
- `shared/package.json` - Version bumped to 2.0.78
- `shared/src/index.ts` - Exported VERSION updated to 2.0.78
- `client/scripts/build-apk.sh` - Reads version/code dynamically from root `package.json`
- `client/src/pages/DownloadPage.tsx` - APK version display sourced from shared VERSION constant
- `client/public/downloads/checksums.json` - Placeholder metadata references latest version

## 🔧 Setup Instructions

### Vercel Configuration
1. Ensure you have an existing Vercel project (do not create a new one)
2. Set the following GitHub Secrets:
   - `VERCEL_TOKEN` - Your Vercel API token
   - `VERCEL_ORG_ID` - Your Vercel organization ID
   - `VERCEL_PROJECT_ID` - Your existing Vercel project ID

3. Link the project locally (if not already linked):
   ```bash
   cd client
   vercel link
   # Select your existing project (do not create new)
   ```

4. Pull production environment:
   ```bash
   vercel pull --environment=production --yes
   ```

### Android Keystore Setup
1. For CI/CD, set the following GitHub Secrets:
   - `KEYSTORE_PASSWORD` - Password for the Android keystore
   - `KEYSTORE_ALIAS` - Alias for the keystore key (default: `fcz-key`)

2. If you need to create a new keystore:
   ```bash
   cd client
   keytool -genkey -v \
     -keystore android/keystore.jks \
     -alias fcz-key \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000 \
     -storepass <your-password> \
     -keypass <your-password> \
     -dname "CN=Fan Club Z, OU=Development, O=Fan Club Z, L=San Francisco, ST=CA, C=US"
   ```

3. **IMPORTANT:** Store the keystore securely. You'll need it for all future APK updates.

### Manual APK Build
To build the APK manually:
```bash
cd client
PROD_URL=https://your-production-url.vercel.app \
KEYSTORE_PASSWORD=your-password \
bash scripts/build-apk.sh
```

The APK will be generated in `client/twa/` and copied to `client/public/downloads/app-latest.apk`.

## 🚦 Deployment

### Automated Deployment (Recommended)
1. Push to `main` branch or trigger workflow manually
2. The workflow will:
   - Run quality gates (typecheck, lint, build, smoke tests)
   - Deploy to Vercel production
   - Build Android APK
   - Copy APK to downloads directory
   - Redeploy with APK assets
   - Run post-deploy health checks

### Manual Deployment
1. Build the client:
   ```bash
   npm run build:client
   ```

2. Deploy to Vercel:
   ```bash
   cd client
   vercel deploy --prod --prebuilt --yes
   ```

3. Build and deploy APK (after production is live):
   ```bash
   cd client
   PROD_URL=https://your-production-url.vercel.app \
   KEYSTORE_PASSWORD=your-password \
   bash scripts/build-apk.sh
   
   # Rebuild and redeploy with APK
   npm run build
   vercel deploy --prod --prebuilt --yes
   ```

## ✅ Post-Deploy Verification

After deployment, verify:

1. **Production URL** - Site is accessible
2. **PWA Manifest** - `/manifest.webmanifest` is reachable
3. **Health Endpoints**:
   - `/api/health/app` - App health status
   - `/api/health/payments` - Payments health status
4. **APK Download**:
   - `/downloads/app-latest.apk` - Returns 200 with proper content-type
   - `/download` - Download page is accessible
5. **Service Worker** - Registers correctly
6. **Offline Cache** - Works as expected

## 📝 Notes

- TypeScript errors exist in the codebase but are non-blocking for builds
- The client build succeeds and is deployable
- Server build has TypeScript errors but is not deployed to Vercel
- APK generation requires the production URL to be live first

## 🔗 Links

- **Production URL:** [To be set after deployment]
- **APK Download:** [To be set after deployment]/downloads/app-latest.apk
- **Download Page:** [To be set after deployment]/download
- **GitHub Workflow:** `.github/workflows/release.yml`

## 🐛 Known Issues

- Pre-existing TypeScript errors in client and server (non-blocking)
- ESLint configuration may need updates for some dependencies

## 📋 Next Steps

1. Configure Vercel secrets in GitHub
2. Configure Android keystore secrets in GitHub
3. Trigger the release workflow or push to main
4. Verify all post-deploy checks pass
5. Test APK installation on Android device
6. Update production URLs in this document

---

**Release Captain:** Automated Release Process  
**Git Tag:** `dev-stable-20251114-2246`  
**Commit SHA:** [To be set after commit]

