# iOS App Store Archive & Submission Guide

## Pre-Archive Checklist

### ✅ Current Status (Verified)
- **Branch**: `release/ios-auth-safearea-v1` ✅
- **Tag**: `ios-stable-20260125` ✅
- **Build**: Succeeded ✅
- **Development Team**: `A6QAVV2GAG` ✅
- **Bundle ID**: `app.fanclubz.app` ✅
- **Code Signing**: Automatic ✅
- **Marketing Version**: 1.0 ✅
- **Build Number**: 1 ✅

## Step-by-Step Archive Process

### 1. Ensure Production Build

**In Xcode:**
1. Open **`client/ios/App/App.xcworkspace`** (NOT `.xcodeproj`)
2. Select **"App"** scheme (top toolbar, next to device selector)
3. Select **"Any iOS Device"** or **"Generic iOS Device"** (NOT a simulator)
4. Go to **Product → Scheme → Edit Scheme...**
5. Under **"Run"** → **"Build Configuration"** → Select **"Release"**
6. Click **"Close"**

### 2. Verify Signing & Capabilities

**In Xcode:**
1. Select **"App"** project in navigator (blue icon at top)
2. Select **"App"** target
3. Go to **"Signing & Capabilities"** tab
4. Verify:
   - ✅ **Team**: `A6QAVV2GAG` (or your team name)
   - ✅ **Bundle Identifier**: `app.fanclubz.app`
   - ✅ **Automatically manage signing**: Checked
   - ✅ **Provisioning Profile**: Should show "Xcode Managed Profile"

**If signing errors appear:**
- Click **"Try Again"** or **"Download Manual Profiles"**
- Ensure your Apple Developer account has access to this bundle ID

### 3. Update Version Numbers (If Needed)

**Current values:**
- **Marketing Version** (CFBundleShortVersionString): `1.0`
- **Build Number** (CFBundleVersion): `1`

**To increment for App Store:**
1. In Xcode: **App** target → **General** tab
2. **Version**: `1.0` (or increment to `1.1`, `2.0`, etc.)
3. **Build**: `1` (increment for each submission: `2`, `3`, etc.)

**Or via project.pbxproj:**
- `MARKETING_VERSION = 1.0;` → Change to your desired version
- `CURRENT_PROJECT_VERSION = 1;` → Increment for each build

### 4. Clean Build Folder

**In Xcode:**
- **Product → Clean Build Folder** (Shift+Cmd+K)

### 5. Create Archive

**In Xcode:**
1. **Product → Archive** (or Cmd+B then Product → Archive)
2. Wait for archive to complete (may take 2-5 minutes)
3. **Organizer** window will open automatically

### 6. Validate Archive

**In Organizer:**
1. Select your archive
2. Click **"Validate App"**
3. Follow prompts:
   - Select your team
   - Choose **"Automatically manage signing"** (recommended)
   - Wait for validation (checks for common issues)
4. If validation passes → proceed to Distribute
5. If errors appear → fix them and re-archive

### 7. Distribute to App Store Connect

**In Organizer:**
1. Select your archive
2. Click **"Distribute App"**
3. Choose **"App Store Connect"**
4. Choose **"Upload"** (not "Export")
5. Select **"Automatically manage signing"**
6. Review app information
7. Click **"Upload"**
8. Wait for upload to complete

### 8. Submit for Review (in App Store Connect)

**After upload completes:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **My Apps → Fan Club Z**
3. Go to **App Store** tab
4. Create new version (if first submission) or select existing version
5. Fill in required metadata:
   - Screenshots (required for each device size)
   - Description
   - Keywords
   - Support URL
   - Privacy Policy URL
6. Submit for review

## Common Issues & Fixes

### Issue: "No signing certificate found"
**Fix**: 
- Xcode → Preferences → Accounts
- Add your Apple ID
- Select team and click "Manage Certificates"
- Download/request certificates

### Issue: "Bundle identifier already exists"
**Fix**:
- Ensure bundle ID `app.fanclubz.app` is registered in your Apple Developer account
- Or change bundle ID in Xcode (requires re-registration)

### Issue: "Missing compliance" or Privacy Info
**Fix**:
- Ensure `PrivacyInfo.xcprivacy` is included in build
- Fill out privacy questions in App Store Connect

### Issue: Archive fails with "Module not found"
**Fix**:
```bash
cd client/ios/App
pod install
# Then re-archive in Xcode
```

## Version Numbering Strategy

**Marketing Version** (CFBundleShortVersionString):
- User-facing version (e.g., `1.0`, `1.1`, `2.0`)
- Increment for major/minor releases

**Build Number** (CFBundleVersion):
- Internal build counter
- **Must increment** for each App Store submission
- Example: `1`, `2`, `3`, ... (always increment, never reuse)

**Best Practice:**
- First submission: Version `1.0`, Build `1`
- Bug fix update: Version `1.0.1`, Build `2`
- Feature update: Version `1.1`, Build `3`
- Major update: Version `2.0`, Build `4`

## Post-Submission

After successful upload:
1. **TestFlight** (optional): Test builds available immediately for internal testing
2. **App Store Review**: Typically 24-48 hours
3. **Release**: After approval, manually release or set to auto-release

## Quick Reference Commands

```bash
# Rebuild iOS before archiving
cd client
npm run build:ios
npx cap sync ios

# Open Xcode workspace (NOT .xcodeproj)
cd client
npm run ios:open
# Then: Product → Archive
```
