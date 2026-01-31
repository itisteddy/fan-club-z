# iOS & Android — Ready for upload and publishing

Both platforms are **built and ready**. Follow the steps below to upload and publish.

---

## Current versions (as of this doc)

| Platform | Marketing / versionName | Build / versionCode | Where to change |
|----------|------------------------|---------------------|-----------------|
| **iOS**  | 1.0                    | 2                   | Xcode → App target → General |
| **Android** | 1.0.0              | 1                   | `client/android/app/build.gradle` |

**Important:** Before each **new** upload you must:
- **iOS:** Increment **Build** (e.g. 2 → 3) in Xcode. Version can stay 1.0 until you do a user-facing release.
- **Android:** Increment **versionCode** (e.g. 1 → 2) in `client/android/app/build.gradle`. versionName can stay 1.0.0 until you do a user-facing release.

---

## iOS — Upload to App Store Connect

### 1. Open Xcode
```bash
cd client
npm run ios:open
```
Or: `open client/ios/App/App.xcworkspace` (always use `.xcworkspace`, not `.xcworkspace`).

### 2. Pre-archive checks
- **Target:** App (under TARGETS).
- **Signing & Capabilities:** Your team selected, **Automatically manage signing** checked.
- **General → Identity:** Bundle Identifier = `app.fanclubz.mobile` (must match App Store Connect).
- **General → Version:** Set **Version** (e.g. 1.0) and **Build** (e.g. 2). **Increment Build for every new upload.**

### 3. Archive
- Scheme selector: choose **Any iOS Device** (not a simulator).
- Menu: **Product → Archive**.
- When Organizer opens, select the new archive.

### 4. Upload
- Click **Distribute App** → **App Store Connect** → **Upload**.
- Follow the prompts (upload symbols if offered).
- In [App Store Connect](https://appstoreconnect.apple.com/) → your app → **TestFlight**: build will appear after processing (often 10–30 min).

### 5. Publish
- **TestFlight:** Add the build to an Internal or External testing group.
- **App Store:** When ready, create a new version in App Store Connect, select this build, fill in metadata, and submit for review.

**Full runbook:** [docs/IOS_RELEASE.md](docs/IOS_RELEASE.md)

---

## Android — Upload to Google Play

### 1. Built artifact
Signed release AAB (already built):

```
client/android/app/build/outputs/bundle/release/app-release.aab
```

### 2. Rebuild (optional)
If you need a fresh build (e.g. after changing version):

```bash
cd client/android
JAVA_HOME="$("/usr/libexec/java_home" -v 21)" ./gradlew :app:bundleRelease
```

Signing uses `client/android/keystore/keystore.properties` (see [client/android/keystore/SIGNING_STEPS.md](client/android/keystore/SIGNING_STEPS.md)).

### 3. Upload to Play Console
1. Go to [Google Play Console](https://play.google.com/console) → your app **Fan Club Z**.
2. **Release** → **Production** (or **Testing** → Internal/Closed testing).
3. **Create new release** (or add to existing).
4. Upload **app-release.aab** from the path above.
5. Add release notes if required, then **Review release** → **Start rollout** (or **Save** for draft).

### 4. Version for next release
In `client/android/app/build.gradle`:
- Bump **versionCode** (e.g. `1` → `2`) for every new upload.
- Bump **versionName** (e.g. `"1.0.0"` → `"1.0.1"`) when you want users to see a new version label.

**Play submission notes:** [docs/playstore_submission.md](docs/playstore_submission.md)

---

## Summary

| Step | iOS | Android |
|------|-----|---------|
| **Artifact** | Archive from Xcode (after Product → Archive) | `client/android/app/build/outputs/bundle/release/app-release.aab` |
| **Upload** | Xcode Organizer → Distribute App → App Store Connect | Play Console → Release → Upload AAB |
| **Version** | Increment Build in Xcode before each archive | Increment versionCode in build.gradle before each build |

Both apps are built and ready; upload and publishing are done in App Store Connect and Google Play Console.
