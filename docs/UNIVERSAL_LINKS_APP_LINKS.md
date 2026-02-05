# Universal Links (iOS) + Android App Links

Prediction share links `https://app.fanclubz.app/p/{id}/{slug}` are set up so that:

- **iOS**: If the native app is installed, the OS opens it via Universal Links.
- **Android**: If the native app is installed, the OS opens it via App Links.
- **Web**: If the app is not installed, the link opens the web prediction page.

## What’s in place (web host)

- **`client/public/.well-known/apple-app-site-association`**  
  Served at `https://app.fanclubz.app/.well-known/apple-app-site-association` (no file extension).  
  Content-Type: `application/json`.  
  **TODO:** Replace `TEAMID` with your Apple Team ID.

- **`client/public/.well-known/assetlinks.json`**  
  Served at `https://app.fanclubz.app/.well-known/assetlinks.json`.  
  **TODO:** Replace placeholder SHA256 fingerprints with your signing cert fingerprints.

- **Vercel**  
  - Rewrites for `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` are listed **before** the SPA catch-all so these URLs are served as static files, not `index.html`.  
  - Header for AASA: `Content-Type: application/json`.  
  - Both **root `vercel.json`** and **`client/vercel.json`** are updated so either deployment works.

- **`/p/:id/:slug`**  
  Unchanged; still routes to the prediction page (or your existing API) as before.

## Values you need to provide

### 1. iOS – AASA (`apple-app-site-association`)

- **TEAMID**  
  Your Apple Developer Team ID (e.g. `ABCD1234`).  
  Find it: [Apple Developer → Membership](https://developer.apple.com/account) → Membership details → Team ID.

- **Bundle ID** (already in repo)  
  `com.fanclubz.app`  
  AASA uses `appID`: `TEAMID.com.fanclubz.app` (e.g. `ABCD1234.com.fanclubz.app`).

**Edit** `client/public/.well-known/apple-app-site-association`: replace `TEAMID` in `"appID": "TEAMID.com.fanclubz.app"` with your Team ID.

### 2. Android – `assetlinks.json`

- **Package name** (already in repo)  
  `com.fanclubz.app`

- **SHA256 cert fingerprints**  
  One (or more) SHA256 fingerprints of the signing key(s) used for the app:

  - **Release (Play Store / production):**  
    From your upload/release keystore.  
    `keytool -list -v -keystore your-release.keystore` → take the SHA256 certificate fingerprint (colon-separated, e.g. `AA:BB:CC:...:ZZ`).

  - **Debug / internal testing:**  
    If you use a different key for internal testing or debug builds, add that fingerprint as a second entry so App Links work for TestFlight/internal track builds.

**Edit** `client/public/.well-known/assetlinks.json`: replace the `TODO_REPLACE_*` entries in `sha256_cert_fingerprints` with your real fingerprints. You can keep one or add multiple (e.g. release + debug).

## After updating the files

1. Commit and deploy so `app.fanclubz.app` serves the updated AASA and assetlinks.
2. **iOS**: In Xcode, add **Associated Domains** → `applinks:app.fanclubz.app` for the app target.
3. **Android**: In `AndroidManifest.xml`, add an intent filter with `android:autoVerify="true"` for `https://app.fanclubz.app` and `pathPrefix="/p/"` (see Android App Links docs).
4. In-app: handle the incoming URL (e.g. from `application(_:open:options:)` / `onNewIntent`) and navigate to the prediction screen for `/p/{id}/{slug}`.

## Verification

- **AASA:**  
  `curl -I https://app.fanclubz.app/.well-known/apple-app-site-association`  
  Expect 200 and `Content-Type: application/json` (no redirect).

- **Assetlinks:**  
  `curl -I https://app.fanclubz.app/.well-known/assetlinks.json`  
  Expect 200 (and JSON body).

- **Prediction page:**  
  Open `https://app.fanclubz.app/p/{id}/{slug}` in a browser; prediction page (or existing API behavior) should still work.

## References

- [Apple – Supporting Universal Links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Android – Verify Android App Links](https://developer.android.com/training/app-links/verify-android-applinks)
