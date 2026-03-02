# Android release signing – step-by-step

## What you already did

- You ran `keytool -genkeypair ...` and created `keystore/release.keystore`.
- You chose a **keystore password** and a **key password** when keytool asked.
- You got a certificate fingerprint (SHA-256). **Save that fingerprint** in a safe place (e.g. password manager); you don’t need it to build, but Google may show it in Play Console.

---

## Step 1: Create `keystore.properties`

1. Open the folder: `client/android/keystore/`
2. Create a new file named **`keystore.properties`** (no `.example`).
3. Put exactly these 4 lines in it:

   ```
   storeFile=keystore/release.keystore
   storePassword=REPLACE_WITH_YOUR_REAL_STORE_PASSWORD
   keyAlias=fanclubz-upload
   keyPassword=REPLACE_WITH_YOUR_REAL_KEY_PASSWORD
   ```

4. **Edit the file:**
   - Replace `REPLACE_WITH_YOUR_REAL_STORE_PASSWORD` with the **exact** password you typed when keytool asked for **“Enter keystore password”**.
   - Replace `REPLACE_WITH_YOUR_REAL_KEY_PASSWORD` with the **exact** password you typed when keytool asked for **“Enter key password”** (or the same as the store password if you pressed Enter).
5. Do **not** change `storeFile` or `keyAlias`.
6. Save the file. Do **not** commit it to git (it’s in `.gitignore`).

---

## Step 2: Build the signed AAB

In a terminal, from the **project root** (the folder that contains `client/`):

```bash
cd client/android
JAVA_HOME="$("/usr/libexec/java_home" -v 21)" ./gradlew :app:bundleRelease
```

When it finishes, the signed bundle is at:

`client/android/app/build/outputs/bundle/release/app-release.aab`

---

## Step 3: Upload to Google Play

1. Go to [Google Play Console](https://play.google.com/console) → your app.
2. **Release** → **Production** (or **Testing**).
3. **Create new release** → upload **`app-release.aab`**.
4. Complete the release and submit.

---

## If you forget the passwords

You cannot recover them. You would need to generate a **new** keystore (and for an already-published app, that involves contacting Google Play support for a key reset). So keep the passwords and the fingerprint in a safe place.
