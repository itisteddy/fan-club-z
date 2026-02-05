# iOS Release: Archive → TestFlight → App Store

**Last Updated:** 2026-01-23  
**Phase 7E:** Deterministic iOS release runbook

---

## Overview

This is a step-by-step, copy-paste friendly guide to build, archive, upload, and distribute the iOS app via TestFlight. Follow this sequence every time to ensure consistency and avoid common failures.

---

## A) Preflight - Build iOS Target

### 1. Verify Build Configuration

Before building, confirm environment:

```bash
cd client

# Check that .env.ios exists and contains:
# VITE_BUILD_TARGET=ios
# VITE_STORE_SAFE_MODE=true
```

### 2. Build iOS Target

```bash
npm run build:ios
```

**Expected output:**
- No TypeScript errors
- Build completes successfully
- Output in `client/dist/`

### 3. Sync to Capacitor

```bash
npx cap sync ios
```

**OR use the combined script:**
```bash
npm run cap:ios:ios
```

**Expected output:**
- Capacitor syncs `dist/` to `ios/App/App/public/`
- No sync errors

### 4. Verify Build Target

Open iOS simulator and enable runtime debug:
```javascript
// In browser console (DEV mode)
localStorage.setItem('DEBUG_RUNTIME', '1');
```

Reload and check console shows:
- `BUILD_TARGET: 'ios'`
- `STORE_SAFE_MODE: true`

---

## B) Xcode Checks (Before Archiving)

### 1. Open Project

```bash
cd client
npm run ios:open
```

OR manually:
```bash
open ios/App/App.xcworkspace
```

**Important:** Always open `.xcworkspace` (not `.xcodeproj`) when using CocoaPods.

### 2. Verify Signing & Capabilities

1. Select **App** target (left panel, under TARGETS)
2. Go to **Signing & Capabilities** tab
3. Verify:

**Team:** Your Apple Developer team selected

**Automatically manage signing:** ✅ Checked

**Bundle Identifier:** `com.fanclubz.app`

**Signing Certificate:** Should show "Apple Development" or "Apple Distribution"

**Provisioning Profile:** Should show automatically managed profile

**Status:** Should show ✅ "Signing and capabilities are configured correctly"

### 3. Verify Bundle Identifier Matches

Bundle ID in Xcode **MUST** match App Store Connect app record exactly.

**Check:**
1. Xcode → App target → General tab → **Identity** section
2. Bundle Identifier: `app.fanclubz.mobile`

### 4. Update Version and Build Number

1. App target → **General** tab
2. Update:

**Version:** `1.0.0` (or your current marketing version)

**Build:** Increment by 1 from last upload
   - First upload: `1`
   - Second upload: `2`
   - And so on...

**Rule:** Build number must be **higher** than any previous upload for this version.

### 5. Verify Privacy Manifest

1. In Project Navigator, find: `App/App/PrivacyInfo.xcprivacy`
2. Click on file → Check File Inspector (right panel)
3. Under **Target Membership:** Ensure **App** is checked
4. Go to App target → **Build Phases** tab
5. Expand **Copy Bundle Resources**
6. Verify `PrivacyInfo.xcprivacy` is listed

---

## C) Archive

### 1. Select Build Destination

In Xcode scheme selector (top toolbar):
- Select **Any iOS Device** (generic iOS device)
- OR select a connected physical device
- **Do NOT** select a simulator (Archive will be disabled)

### 2. Run Archive

**Xcode Menu:**
```
Product → Archive
```

OR keyboard shortcut: `Cmd+Shift+B` (depending on Xcode version)

**Expected Duration:** 2-5 minutes depending on project size

**Expected Outcome:**
- Build succeeds without errors
- **Organizer** window opens automatically
- Archive appears in the list with timestamp

### 3. Troubleshooting Archive Failures

**"Archive is grayed out"**
- Fix: Select "Any iOS Device" (not simulator)

**"Code signing error"**
- Fix: Verify signing & capabilities configuration
- Fix: Ensure Apple ID is added to Xcode Accounts
- Fix: Try Product → Clean Build Folder, then archive again

**"Missing privacy manifest"**
- Fix: Ensure `PrivacyInfo.xcprivacy` is in Copy Bundle Resources
- Fix: Clean build folder and re-archive

---

## D) Generate Privacy Report (Recommended)

Before uploading, generate a privacy report to catch issues early:

### Steps

1. In **Organizer**, select your archive
2. Click **Generate Privacy Report** button
3. Review the report for:
   - Required-reason API usage
   - Third-party SDK privacy manifests
   - Any warnings

### Expected Report

- **App-level manifest:** Should show your PrivacyInfo.xcprivacy
- **Third-party SDKs:** Capacitor pods should have manifests (if v6.2+)
- **Warnings:** Address any warnings before uploading

---

## E) Upload to App Store Connect

### 1. Distribute App

In Organizer:
1. Select your archive
2. Click **Distribute App** button
3. Select **App Store Connect** → **Next**
4. Select **Upload** → **Next**
5. **Distribution options:**
   - ✅ Upload your app's symbols (recommended for crash reports)
   - ✅ Manage Version and Build Number (if Xcode suggests)
   - Review other options (usually defaults are fine)
6. Click **Next**

### 2. Re-sign and Upload

Xcode will:
1. Re-sign the archive with distribution certificate
2. Upload to App Store Connect

**Expected Duration:** 5-15 minutes depending on app size and internet speed

**Expected Outcome:**
- Upload completes successfully
- Xcode shows "Upload Successful" message

### 3. Verify Upload

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Select your app → **TestFlight** tab
3. Under **iOS Builds**, you should see:
   - New build appears within 5-30 minutes
   - Status: "Processing" → then "Ready to Test"

**Note:** Processing can take 10-30 minutes. You'll receive an email when processing completes.

### 4. Troubleshooting Upload Failures

**"Invalid Bundle"**
- Check App Store Connect email for specific error
- Common: Bundle ID mismatch, missing entitlements, invalid icon

**"ITMS-91061: Missing privacy manifest"**
- Fix: Ensure PrivacyInfo.xcprivacy is in app bundle
- Fix: Update third-party SDKs to versions with privacy manifests
- Reference: `docs/PRIVACY_MANIFEST.md`

**"Build number too low"**
- Fix: Increment build number in Xcode
- Fix: Each upload must have unique build number higher than previous

**"Invalid Privacy Manifest"**
- Fix: Validate XML syntax: `plutil -lint PrivacyInfo.xcprivacy`
- Fix: Ensure all keys use correct Apple-defined strings
- Reference: [Apple TN3181](https://developer.apple.com/documentation/technotes/tn3181-investigating-privacy-manifest-issues)

---

## F) TestFlight Internal Testing

### 1. Wait for Processing

After upload:
- Build status: "Processing"
- Wait 10-30 minutes
- You'll receive email when ready

### 2. Add Build to Internal Group

1. App Store Connect → **TestFlight** tab
2. Select your Internal Testing group
3. Click **+** next to Builds
4. Select the build you just uploaded
5. Click **Add**

**Note:** Internal builds don't require review and are available immediately.

### 3. Notify Testers

Testers will receive:
- Email notification
- Push notification (if TestFlight app installed)

### 4. Installation Steps (for Testers)

1. Install **TestFlight** app from App Store (if not already installed)
2. Open invitation email
3. Click **View in TestFlight**
4. Click **Install**
5. App installs on device

---

## G) TestFlight Smoke Test Checklist

After internal testers install, verify these critical flows:

### Pre-Login
- [ ] App launches without crash
- [ ] No CORS/preflight errors in logs
- [ ] Public predictions load (or show "Sign in required")
- [ ] Health check succeeds (`/api/v2/health`)

### Login Flow
- [ ] Tap "Continue with Google"
- [ ] OAuth browser sheet opens
- [ ] Complete Google sign-in
- [ ] Browser sheet closes automatically
- [ ] User lands in app authenticated
- [ ] **No login loop** - doesn't repeatedly open auth

### Session Persistence
- [ ] Background app (swipe up)
- [ ] Foreground app
- [ ] User still authenticated (no re-login required)
- [ ] Close app completely
- [ ] Reopen app
- [ ] User still authenticated

### UI Verification
- [ ] Header not covered by notch/dynamic island
- [ ] Safe area padding looks natural
- [ ] No PWA install banners/prompts
- [ ] Store-safe mode indicator present (if enabled)

### Features
- [ ] Predictions feed loads
- [ ] Can create predictions (if allowed)
- [ ] Demo credits work
- [ ] Crypto wallet unavailable (if store-safe)
- [ ] Fiat payments unavailable (if store-safe)
- [ ] Navigation works (all tabs/screens)

### Cancel Case
- [ ] Tap "Continue with Google"
- [ ] Close browser sheet (cancel)
- [ ] App returns to login screen
- [ ] **No auto re-open** of auth browser

---

## H) External Testing (Optional, Before App Store Submission)

### Differences from Internal Testing

- **Review required:** Apple reviews the build before external testers can access
- **Public link:** Can invite up to 10,000 external testers
- **Longer delay:** Review takes 24-48 hours

### When to Use

- Testing with users outside your organization
- Broader beta testing
- Marketing previews

### Setup

1. App Store Connect → TestFlight → **External Testing**
2. Create group → Add build → Submit for Review
3. Wait for Apple approval
4. Share public TestFlight link

---

## I) Release Build Scripts (Quick Reference)

### Full iOS Release Prep

```bash
cd client
npm run build:ios
npm run cap:ios:ios
npm run ios:open
# Then in Xcode: Product → Archive
```

### Alternative (Manual Steps)

```bash
cd client
npm run build:ios
npx cap sync ios
open ios/App/App.xcworkspace
# Then in Xcode: Product → Archive
```

---

## Common Failure Points & Prevention

### 1. Wrong Build Target Synced
**Problem:** Synced web build to iOS  
**Prevention:** Always use `npm run cap:ios:ios` (not `cap:ios:web`)

### 2. Build Number Not Incremented
**Problem:** Upload fails with "build number must be higher"  
**Prevention:** Increment build number before archiving

### 3. Missing Privacy Manifest
**Problem:** Upload rejected with ITMS-91061  
**Prevention:** Verify manifest in Copy Bundle Resources before archiving

### 4. Signing Errors
**Problem:** Archive fails with provisioning/certificate errors  
**Prevention:** Use automatic signing + verify team selected

### 5. Bundle ID Mismatch
**Problem:** Upload fails with "bundle id doesn't match"  
**Prevention:** Verify Xcode bundle ID (`com.fanclubz.app`) === App Store Connect bundle ID

---

## Verification Checklist

### Before Archive
- [ ] iOS build complete (`npm run build:ios`)
- [ ] Capacitor synced (`npx cap sync ios`)
- [ ] Team and signing configured
- [ ] Bundle ID matches App Store Connect
- [ ] Version/build number updated
- [ ] Privacy manifest in target

### Before Upload
- [ ] Archive succeeded
- [ ] Privacy report reviewed (no critical warnings)
- [ ] Build destination was "Any iOS Device" (not simulator)

### After Upload
- [ ] Build appears in App Store Connect within 30 minutes
- [ ] Processing completes (wait for email)
- [ ] Build assigned to Internal Testing group
- [ ] Internal testers can install via TestFlight

---

## Next Steps

After TestFlight internal testing passes:
1. Fix any issues found by testers
2. Upload new build (increment build number)
3. When ready: Submit for App Store Review
4. Reference: Apple's [App Store Connect Help](https://help.apple.com/app-store-connect/)

---

## Support Resources

- [Xcode Distribution Guide](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Capacitor iOS Deployment](https://capacitorjs.com/docs/ios/deploying-to-app-store)
