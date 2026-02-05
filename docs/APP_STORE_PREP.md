# Prepare Android & iOS for Upload and Publish

Use this checklist before uploading to **Google Play** and **App Store Connect**. For full runbooks, see [IOS_RELEASE.md](IOS_RELEASE.md) and [playstore_submission.md](playstore_submission.md).

---

## 1. Version numbers (bump before each new upload)

| Platform  | Marketing version | Build / versionCode | Where to change |
|-----------|-------------------|--------------------|-----------------|
| **iOS**   | 1.0               | 2                  | Xcode → App target → General → Version / Build |
| **Android** | 1.0.0           | 1                  | `client/android/app/build.gradle` |

**Rules:**

- **iOS:** Increment **Build** (e.g. 2 → 3) for every new upload. Keep **Version** (e.g. 1.0) until you do a user-facing release.
- **Android:** Increment **versionCode** (e.g. 1 → 2) for every new upload. Bump **versionName** (e.g. 1.0.0 → 1.0.1) when you want a new version label for users.

---

## 2. One-command prep (build + sync)

From repo root or `client/`:

```bash
cd client

# iOS: build for iOS, sync to native project, then open Xcode
pnpm run prep:ios
pnpm run ios:open
# In Xcode: Product → Archive, then Distribute App → App Store Connect

# Android: build for Android, sync to native project, then build signed AAB
pnpm run prep:android
cd android
JAVA_HOME="$(/usr/libexec/java_home -v 21)" ./gradlew :app:bundleRelease
# AAB: client/android/app/build/outputs/bundle/release/app-release.aab
```

---

## 3. Pre-upload checklist

### iOS

- [ ] **Version/Build:** Version and Build set in Xcode (General → Identity). Build incremented from last upload.
- [ ] **Signing:** App target → Signing & Capabilities → Team selected, **Automatically manage signing** checked.
- [ ] **Bundle ID:** `com.fanclubz.app` (must match App Store Connect).
- [ ] **Scheme:** **Any iOS Device** (not a simulator) before Product → Archive.
- [ ] **Privacy manifest:** `App/App/PrivacyInfo.xcprivacy` is in Copy Bundle Resources.

### Android

- [ ] **versionCode / versionName:** Set in `client/android/app/build.gradle`; versionCode higher than last upload.
- [ ] **Signing:** Release keystore configured via `client/android/keystore/keystore.properties` or env vars (see [client/android/keystore/README.md](../client/android/keystore/README.md)).
- [ ] **Package name:** `com.fanclubz.app` (in build.gradle `applicationId`).

---

## 4. Store metadata (fill before first publish)

### Both stores

- [ ] **App name:** Fan Club Z (already set in projects).
- [ ] **Privacy policy URL:** Required; add a live URL in store listing and, for Android, in Data safety.
- [ ] **Support / contact:** Email or URL for support.

### App Store Connect

- [ ] Short description, keywords, category.
- [ ] Screenshots (required sizes per device family).
- [ ] Optional: promotional text, what’s new, age rating, etc.

### Google Play Console

- [ ] Short description (max 80 chars), full description.
- [ ] Screenshots (phone, 7″ tablet, 10″ tablet if applicable).
- [ ] Data safety form: data types, collection, sharing, security practices.
- [ ] Content rating questionnaire.

---

## 5. Upload paths

| Platform  | Artifact | Where to upload |
|-----------|----------|------------------|
| **iOS**   | Archive from Xcode (Product → Archive) | Xcode Organizer → Distribute App → App Store Connect → Upload |
| **Android** | `client/android/app/build/outputs/bundle/release/app-release.aab` | Play Console → Release → Production (or Testing) → Upload AAB |

---

## 6. After upload

- **iOS:** Build appears in App Store Connect → TestFlight after processing (often 10–30 min). Add to Internal/External testing, then submit for App Store review when ready.
- **Android:** Create (or add to) release, add release notes, review and start rollout (or save as draft).

---

## Quick reference

| Step        | iOS | Android |
|------------|-----|---------|
| Prep       | `pnpm run prep:ios` then `pnpm run ios:open` | `pnpm run prep:android` then `cd android && ./gradlew :app:bundleRelease` |
| Version    | Increment Build in Xcode | Increment versionCode in `app/build.gradle` |
| Signing    | Xcode Signing & Capabilities | `android/keystore/keystore.properties` or env |
| Full guide | [IOS_RELEASE.md](IOS_RELEASE.md) | [playstore_submission.md](playstore_submission.md) |
