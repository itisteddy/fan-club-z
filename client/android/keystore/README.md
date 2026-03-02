# Android release signing (Play Store upload key)

This folder is for **local-only** release signing material.

## What gets committed vs ignored

- ✅ Committed: this `README.md`
- ❌ Ignored by git:
  - `keystore/release.keystore` (or `*.jks`)
  - `keystore/keystore.properties` (contains secrets)

## Generate the upload keystore (recommended)

Run from `client/android/`:

```bash
mkdir -p keystore

# Pick strong passwords and store them in a password manager.
export ANDROID_RELEASE_STORE_PASSWORD="__SET_ME__"
export ANDROID_RELEASE_KEY_PASSWORD="__SET_ME__"
export ANDROID_RELEASE_KEY_ALIAS="fanclubz-upload"

keytool -genkeypair -v \
  -keystore keystore/release.keystore \
  -alias "$ANDROID_RELEASE_KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$ANDROID_RELEASE_STORE_PASSWORD" \
  -keypass "$ANDROID_RELEASE_KEY_PASSWORD" \
  -dname "CN=Fan Club Z, OU=Mobile, O=Fan Club Z, L=, ST=, C=US"
```

## Configure Gradle signing (two supported options)

### Option A (recommended): environment variables

Set these in your shell / CI secrets:

- `ANDROID_RELEASE_STORE_FILE` (optional, defaults to `keystore/release.keystore`)
- `ANDROID_RELEASE_STORE_PASSWORD`
- `ANDROID_RELEASE_KEY_ALIAS`
- `ANDROID_RELEASE_KEY_PASSWORD` (optional; defaults to store password)

### Option B: `keystore/keystore.properties` (untracked)

Create `client/android/keystore/keystore.properties` (DO NOT COMMIT):

```properties
storeFile=keystore/release.keystore
storePassword=__SET_ME__
keyAlias=fanclubz-upload
keyPassword=__SET_ME__
```

## Versioning policy (Play Store requirement)

Google Play requires **monotonically increasing** `versionCode`.

- `versionName`: user-facing (e.g., `1.0.0`)
- `versionCode`: must increase every release (e.g., 1, 2, 3, ...)

Update these in:
- `client/android/app/build.gradle`

