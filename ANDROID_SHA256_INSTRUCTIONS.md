# Android SHA-256 Fingerprint Generation Instructions

This document provides step-by-step instructions for generating SHA-256 fingerprints for Android App Links verification and Google OAuth client configuration.

## Prerequisites

- Java Keytool (included with Java JDK)
- Your release keystore file (or debug keystore for testing)

## Step 1: Locate Your Keystore

### For Release Builds (Production)
Your release keystore should be stored securely. Common locations:
- `android/app/release.keystore` (if stored in project - **NOT RECOMMENDED for production**)
- Secure location outside the repository (recommended)

### For Debug Builds (Testing)
Debug keystore is typically located at:
- **macOS/Linux:** `~/.android/debug.keystore`
- **Windows:** `C:\Users\<YourUsername>\.android\debug.keystore`

## Step 2: Generate SHA-256 Fingerprint

### Using Keytool (Command Line)

#### For Release Keystore:
```bash
keytool -list -v -keystore <path-to-your-release.keystore> -alias <your-key-alias>
```

**Example:**
```bash
keytool -list -v -keystore ~/secure/fanclubz-release.keystore -alias fanclubz
```

#### For Debug Keystore:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### What You'll See:
The command will output certificate information including:

```
Certificate fingerprints:
     SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
     SHA256: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

**Copy the SHA256 line** (the long string of hex characters separated by colons).

## Step 3: Format for assetlinks.json

Remove the colons (`:`) from the SHA-256 fingerprint for use in `assetlinks.json`:

**Before (from keytool):**
```
SHA256: AA:BB:CC:DD:EE:FF:AA:BB:CC:DD:EE:FF:AA:BB:CC:DD:EE:FF:AA:BB:CC:DD:EE:FF:AA:BB:CC:DD:EE:FF:AA:BB
```

**After (for assetlinks.json):**
```
AABBCCDDEEFFAABBCCDDEEFFAABBCCDDEEFFAABBCCDDEEFFAABBCCDDEEFFAABB
```

### Quick Format Command:
```bash
# On macOS/Linux
keytool -list -v -keystore <keystore-path> -alias <alias> | grep "SHA256:" | sed 's/SHA256: //' | sed 's/://g' | tr -d ' '

# Or manually: copy the SHA256 line and remove all colons and spaces
```

## Step 4: Use in Google Cloud Console

### For Android OAuth Client:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find or create your **Android OAuth 2.0 Client ID**
4. Add the **SHA-1 fingerprint** (not SHA-256) for OAuth client configuration
5. Package name: `com.fanclubz.app`

**Note:** Google OAuth clients use **SHA-1**, not SHA-256. Use the SHA1 line from keytool output.

## Step 5: Use in assetlinks.json

### Create `.well-known/assetlinks.json` file:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.fanclubz.app",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT_WITHOUT_COLONS"
    ]
  }
}]
```

### Deploy to:
```
https://app.fanclubz.app/.well-known/assetlinks.json
```

**Important:** 
- Use **SHA-256** for assetlinks.json (Android App Links verification)
- Use **SHA-1** for Google OAuth client configuration
- Remove all colons from the fingerprint for assetlinks.json
- Keep colons for Google Cloud Console (it will accept both formats)

## Step 6: Verify App Links

After deploying `assetlinks.json`:

1. **Using Android Studio:**
   - Open your project in Android Studio
   - Go to **Tools** → **App Links Assistant**
   - Click **Open URL Mapping Editor**
   - Click **Verify App Links** → Enter your domain
   - Android Studio will verify the assetlinks.json file

2. **Using Command Line:**
   ```bash
   # Test if assetlinks.json is accessible
   curl https://app.fanclubz.app/.well-known/assetlinks.json
   
   # Should return your JSON file
   ```

3. **Using Android Device:**
   - Install your app on a physical device
   - Use `adb` to test deep links:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "https://app.fanclubz.app/auth/callback"
   ```

## Troubleshooting

### Issue: "No matching SHA-256 fingerprint found"
- **Solution:** Ensure the SHA-256 in `assetlinks.json` matches exactly (no colons, uppercase)
- Verify the keystore used to sign the APK matches the one you generated the fingerprint from

### Issue: "App Links verification failed"
- **Solution:** 
  - Ensure `assetlinks.json` is publicly accessible (no authentication required)
  - Content-Type must be `application/json`
  - File must be served over HTTPS
  - Wait 20 minutes after deployment for Google to re-verify

### Issue: "OAuth redirect_uri_mismatch"
- **Solution:** 
  - For Android OAuth client, Google auto-generates the redirect URI
  - Format: `com.googleusercontent.apps.<CLIENT_ID>:/oauth2redirect`
  - Ensure this matches what's in your code (see `supabase.ts`)

## Security Notes

⚠️ **IMPORTANT:**
- **Never commit keystore files to version control**
- Store release keystore in a secure location (password manager, secure vault)
- Keep backup copies of your keystore in multiple secure locations
- Document keystore location and passwords securely (not in code)

## Quick Reference

| Use Case | Fingerprint Type | Format | Where to Use |
|----------|-----------------|--------|--------------|
| Android App Links | SHA-256 | No colons | `assetlinks.json` |
| Google OAuth Client | SHA-1 | With or without colons | Google Cloud Console |
| Play App Signing | SHA-256 | No colons | Play Console (auto-generated) |

## Example Workflow

1. **Generate fingerprint:**
   ```bash
   keytool -list -v -keystore release.keystore -alias fanclubz
   ```

2. **Copy SHA-256** (remove colons):
   ```
   AABBCCDDEEFFAABBCCDDEEFFAABBCCDDEEFFAABBCCDDEEFFAABBCCDDEEFFAABB
   ```

3. **Add to assetlinks.json:**
   ```json
   "sha256_cert_fingerprints": ["AABBCCDDEEFFAABBCCDDEEFFAABBCCDDEEFFAABBCCDDEEFFAABBCCDDEEFFAABB"]
   ```

4. **Deploy to:** `https://app.fanclubz.app/.well-known/assetlinks.json`

5. **Verify:** Use Android Studio App Links Assistant or `adb` command

---

**Last Updated:** November 17, 2025

