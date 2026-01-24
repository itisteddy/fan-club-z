# iOS Privacy Manifest Guide

**Last Updated:** 2026-01-23  
**Phase 7C:** Privacy manifest and required-reason API compliance

---

## What is a Privacy Manifest?

A **Privacy Manifest** (`PrivacyInfo.xcprivacy`) is an Apple-required file that declares:
- What data your app collects
- Why it collects that data
- Whether the app uses tracking
- Which required-reason APIs your app uses

Apple requires this for all apps and third-party SDKs, especially those using certain APIs (file timestamps, system boot time, disk space, user defaults, etc.).

**Reference:** [Apple Privacy Manifest Documentation](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)

---

## Our Privacy Manifest Location

```
client/ios/App/App/PrivacyInfo.xcprivacy
```

This file **must be**:
1. Added to the **App target** in Xcode
2. Included in "Copy Bundle Resources" for the App target
3. Present in the final app bundle

---

## Current Privacy Declarations

### Data Collection
We declare collection of:
- **User ID** - For app functionality (authentication, user-specific data)
- **Name** - For app functionality (user profile)
- **Email Address** - For app functionality (authentication)

All data is:
- ✅ Linked to user identity
- ❌ NOT used for tracking
- Purpose: App functionality only

### Tracking
- ✅ NO tracking (`NSPrivacyTracking: false`)
- ✅ NO tracking domains

### Required-Reason APIs
We declare use of:
- **UserDefaults (CA92.1)** - "Accessing user defaults from the app, app extensions, or App Clips"

---

## iOS Dependencies Inventory

### Capacitor Core + Plugins
- `@capacitor/core` (v8.0.1)
- `@capacitor/ios` (v8.0.1)
- `@capacitor/app` (v8.0.0) - Deep link handling
- `@capacitor/browser` (v8.0.0) - OAuth browser sheet

### Dependency Manager
- **CocoaPods** (see `client/ios/App/Podfile`)
- Pods directory: `client/ios/App/Pods/`

### Third-Party SDKs
Based on `package.json`:
- Supabase (authentication) - uses standard HTTP
- WalletConnect/Reown SDK (crypto wallets) - if included in native build
- No analytics SDKs (Sentry, GA, etc.) in base build

**Note:** Run `pod list` in `client/ios/App/` to see all CocoaPods dependencies.

---

## Verification Steps

### 1. Confirm Manifest is in Target

1. Open `client/ios/App/App.xcworkspace` in Xcode
2. In Project Navigator, find `App/App/PrivacyInfo.xcprivacy`
3. Click on the file, check File Inspector (right panel)
4. Under "Target Membership", ensure "App" is checked

### 2. Confirm Manifest is in Bundle Resources

1. Select the **App** target in Xcode
2. Go to **Build Phases** tab
3. Expand **Copy Bundle Resources**
4. Verify `PrivacyInfo.xcprivacy` is listed

If not listed:
- Click the "+" button
- Add `PrivacyInfo.xcprivacy`

### 3. Generate Privacy Report

1. Archive the app: **Product → Archive**
2. In Organizer, select the archive
3. Click **Generate Privacy Report**
4. Review the report for:
   - Required-reason API usage
   - Third-party SDK privacy manifests
   - Any warnings or missing declarations

### 4. Verify in Built App Bundle

After archiving:
```bash
# Extract the archive (path shown in Xcode Organizer)
# Find PrivacyInfo.xcprivacy in:
# App.app/PrivacyInfo.xcprivacy
```

---

## Handling ITMS-91061 (Missing SDK Privacy Manifest)

### What is ITMS-91061?

After uploading to App Store Connect, you may receive an email like:

```
ITMS-91061: Missing privacy manifest
The app references one or more symbols from "ThirdPartySDK.framework"
that require privacy manifests.
```

### Fix Path

1. **Identify the SDK:**
   - Apple's email will list the exact SDK path/name
   - Example: `Pods/SomeSDK/SomeSDK.framework`

2. **Check SDK version:**
   - See if there's a newer version with privacy manifest support
   - Check SDK's GitHub/docs for privacy manifest updates

3. **Update the SDK:**
   ```bash
   # Update in package.json or Podfile
   # Then reinstall
   cd client/ios/App
   pod install
   ```

4. **Verify manifest is included:**
   - Check if `ThirdPartySDK.bundle/PrivacyInfo.xcprivacy` exists in Pods
   - Re-archive and upload

5. **If SDK doesn't have manifest:**
   - Replace with alternative SDK that has compliance
   - OR contact SDK maintainer
   - OR remove SDK if not critical

**Do NOT** add declarations to your app's PrivacyInfo.xcprivacy for third-party SDK usage unless the SDK vendor explicitly instructs this.

---

## Required-Reason APIs

### What are Required-Reason APIs?

Apple maintains a list of APIs that require approved reason codes if used:
- File timestamps
- System boot time
- Disk space
- Active keyboard
- User defaults

**Reference:** [Apple Required Reason API Documentation](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api)

### Our Declarations

**UserDefaults (CA92.1):**
- **API:** `NSPrivacyAccessedAPICategoryUserDefaults`
- **Reason:** CA92.1 - "Accessing user defaults from the app"
- **Usage:** Session storage, preferences, feature flags

### How to Add More

If Xcode Privacy Report shows additional required-reason API usage:

1. Identify the API category from the report
2. Find the approved reason code from Apple's list
3. Add to `NSPrivacyAccessedAPITypes` array in `PrivacyInfo.xcprivacy`

Example:
```xml
<dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
        <string>C617.1</string>
    </array>
</dict>
```

---

## Preflight Checklist (Before Upload)

- [ ] `PrivacyInfo.xcprivacy` exists in `client/ios/App/App/`
- [ ] Manifest is added to App target
- [ ] Manifest is in Copy Bundle Resources
- [ ] Privacy Report generated and reviewed
- [ ] All required-reason APIs have approved reason codes
- [ ] No third-party SDK warnings (or all SDKs updated)
- [ ] Archive builds successfully
- [ ] Upload to App Store Connect succeeds

---

## Troubleshooting

### "Invalid Privacy Manifest" Error

**Symptoms:** Upload to App Store Connect fails with "invalid privacy manifest"

**Fixes:**
1. Validate XML syntax:
   ```bash
   plutil -lint client/ios/App/App/PrivacyInfo.xcprivacy
   ```
2. Ensure all keys use correct Apple-defined strings (no typos)
3. Check that reason codes are from Apple's approved list
4. Reference: [Apple TN3181](https://developer.apple.com/documentation/technotes/tn3181-investigating-privacy-manifest-issues)

### "Manifest Not Found in Bundle"

**Symptoms:** Privacy report shows no app manifest, or App Store Connect says manifest is missing

**Fixes:**
1. Verify manifest is in Copy Bundle Resources (Build Phases)
2. Clean build folder: **Product → Clean Build Folder**
3. Re-archive

### "Required-Reason API Not Declared"

**Symptoms:** Upload succeeds but email warns about undeclared API usage

**Fixes:**
1. Generate Privacy Report in Xcode
2. Identify which API is flagged
3. Add the API and approved reason code to manifest
4. Re-upload

---

## Updating the Manifest

### When to Update

- Adding new features that collect additional data
- Using new required-reason APIs
- Apple releases new privacy requirements
- Third-party SDK adds privacy-sensitive behavior

### How to Update

1. Edit `client/ios/App/App/PrivacyInfo.xcprivacy` directly (XML)
2. OR use Xcode Privacy UI (select file → Right panel → Privacy tab)
3. Validate changes: `plutil -lint PrivacyInfo.xcprivacy`
4. Test by archiving and generating privacy report

---

## Reference Links

- [Apple Privacy Manifest Files](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [Describing Data Use in Privacy Manifests](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_data_use_in_privacy_manifests)
- [Required Reason API](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api)
- [TN3181: Investigating Privacy Manifest Issues](https://developer.apple.com/documentation/technotes/tn3181-investigating-privacy-manifest-issues)
- [Capacitor Privacy Manifest Guidance](https://capacitorjs.com/docs/ios/privacy-manifest)

---

## Next Steps

After Phase 7C:
1. Verify manifest is in target and bundle resources
2. Generate privacy report
3. Proceed to Phase 7D (Apple Developer setup)
4. Proceed to Phase 7E (Archive and TestFlight)
