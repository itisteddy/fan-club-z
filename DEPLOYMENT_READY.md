# Deployment ready — Web, iOS, Android

Use this as the single runbook for deploying Fan Club Z: SQL, web (Render + Vercel), iOS (TestFlight/App Store), and Android (Play Console).

---

## 1. SQL (Supabase) — run once

Run this migration in **Supabase → SQL Editor** before or when enabling Odds V2. Safe to run anytime; existing rows stay legacy.

**File:** `server/migrations/324_prediction_odds_model.sql`

1. Open Supabase Dashboard → SQL Editor → New query.
2. Paste the full contents of `server/migrations/324_prediction_odds_model.sql`.
3. Run. Expect: "Success. No rows returned."
4. Optional check:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'predictions' AND column_name = 'odds_model';
   ```
   Should return one row: `odds_model`.

**If you skip this:** Odds V2 will not work (server expects `odds_model`). Legacy odds and settlement continue to work.

---

## 2. Web deployment

### Backend (Render)

- **Service:** `fan-club-z` (or your API service name)
- **Build:** Uses `buildCommand: cd .. && npm ci --legacy-peer-deps && npm run build:server` from repo root.
- **Start:** `npm start` in `server/`.

**Required env (see PRODUCTION_DEPLOYMENT_CHECKLIST.md):**  
`NODE_ENV`, `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET`, `SESSION_SECRET`, `CORS_ORIGINS`, payment/chain vars, etc.

**Optional (Odds V2):**

- `FLAG_ODDS_V2=1` — new predictions get `odds_model = 'pool_v2'` and use the new pool-based odds/settlement. Omit or `0` for legacy only.

**Deploy:** Push to `main` (if auto-deploy is on) or trigger manual deploy in Render dashboard.

---

### Frontend (Vercel)

- **Build:** Uses `vercel.json`: `npm --prefix client install && npm --prefix client run build`.
- **Output:** `client/dist`.

**Required env:**  
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_APP_URL`, `VITE_WALLETCONNECT_PROJECT_ID`, Base/USDC/escrow vars as in PRODUCTION_DEPLOYMENT_CHECKLIST.md.

**Optional (Odds V2):**

- `VITE_FCZ_ODDS_V2=1` — enables Odds V2 UI (reference odds, payout preview, "Est. X.XXx"). Must match server: enable only if Render has `FLAG_ODDS_V2=1` and migration 324 has been run.

**Deploy:** Push to connected branch or trigger deploy in Vercel dashboard.

---

## 3. iOS build and upload

**Full guide:** `docs/IOS_RELEASE.md`

**Quick sequence:**

```bash
cd client
npm run build:ios
npx cap sync ios
npm run ios:open
```

Then in Xcode:

1. Select **App** target → **Signing & Capabilities** (team, automatic signing).
2. **General** → set **Version** and **Build** (increment build for each upload).
3. Scheme: select **Any iOS Device** (not a simulator).
4. **Product → Archive**.
5. In Organizer: **Distribute App** → App Store Connect → **Upload**.
6. In [App Store Connect](https://appstoreconnect.apple.com/) → TestFlight → add build to Internal Testing (or submit for App Store review).

**Bundle ID:** `app.fanclubz.mobile` (must match App Store Connect).

---

## 4. Android build and upload

**Full guide:** `client/android/keystore/SIGNING_STEPS.md`

**Prerequisites:** `client/android/keystore/keystore.properties` with real `storePassword` and `keyPassword` (see SIGNING_STEPS.md).

**Build signed AAB (from project root):**

```bash
cd client/android
JAVA_HOME="$("/usr/libexec/java_home" -v 21)" ./gradlew :app:bundleRelease
```

**Output:** `client/android/app/build/outputs/bundle/release/app-release.aab`

**Upload:**

1. [Google Play Console](https://play.google.com/console) → your app.
2. **Release** → **Production** (or **Testing**) → **Create new release**.
3. Upload `app-release.aab`.
4. Complete release and submit.

**Version:** Bump `versionCode` in `client/android/app/build.gradle` for each new release.

---

## Summary

| Step | Action |
|------|--------|
| **SQL** | Run `server/migrations/324_prediction_odds_model.sql` in Supabase (required for Odds V2). |
| **Web** | Render: set env (optional `FLAG_ODDS_V2=1`). Vercel: set env (optional `VITE_FCZ_ODDS_V2=1`). Deploy both. |
| **iOS** | `npm run build:ios` → `cap sync ios` → open Xcode → Archive → Upload to App Store Connect. |
| **Android** | `./gradlew :app:bundleRelease` in `client/android` → upload `app-release.aab` to Play Console. |

**Odds V2:** Implemented and safe. Enable only after running migration 324 and setting `FLAG_ODDS_V2=1` (Render) and `VITE_FCZ_ODDS_V2=1` (Vercel). Legacy behavior is unchanged when flags are off or migration not run.
