# Handover — Deployment status and your next steps

**Date:** After push to `main` and local iOS/Android builds.

---

## ✅ Done (no further action from automation)

### Web (autodeploy triggered)
- **Pushed to `main`:** Commit `dfd2ca86` — "Odds V2 + deployment ready: migration 324, pool_v2 settlement, UI fix, DEPLOYMENT_READY and checklist"
- **Render** and **Vercel** will autodeploy from `main` (if connected). Env vars are set per your note.
- **Verify:** After a few minutes, check Render dashboard (API) and Vercel dashboard (frontend) for successful deploy. Hit `https://app.fanclubz.app` and your API URL to confirm.

### iOS (ready to archive and upload)
- **iOS build:** `npm run build:ios` completed; output in `client/dist/`
- **Capacitor sync:** `npx cap sync ios` completed; `client/ios/App/App/public/` is up to date
- **Your steps (manual only):**
  1. Open Xcode: `cd client && npm run ios:open` (or open `client/ios/App/App.xcworkspace`)
  2. Select **App** target → **Signing & Capabilities** (team, automatic signing)
  3. **General** → set **Version** and **Build** (increment build for this release)
  4. Scheme: **Any iOS Device** (not a simulator)
  5. **Product → Archive**
  6. In Organizer: **Distribute App** → App Store Connect → **Upload**
  7. In [App Store Connect](https://appstoreconnect.apple.com/) → TestFlight → add build to Internal Testing (or submit for App Store)
- **Full runbook:** `docs/IOS_RELEASE.md`

### Android (AAB built)
- **Release AAB built:** Signed bundle is at  
  **`client/android/app/build/outputs/bundle/release/app-release.aab`**
- **Your steps (manual only):**
  1. Go to [Google Play Console](https://play.google.com/console) → your app
  2. **Release** → **Production** (or **Testing**) → **Create new release**
  3. Upload **`app-release.aab`** (path above)
  4. Complete the release and submit
- **Signing / rebuild:** `client/android/keystore/SIGNING_STEPS.md`

---

## What only you can do

| Task | Why |
|------|-----|
| Confirm web deploy | Render/Vercel dashboards and live URLs are in your account |
| Run migration 324 (if using Odds V2) | Supabase SQL Editor is in your project |
| Archive & upload iOS | Xcode and App Store Connect require your Apple ID and signing |
| Upload Android AAB | Play Console requires your Google account |
| Increment version/build | You decide version numbers and when to release |

---

## Quick reference

- **Deployment runbook:** `DEPLOYMENT_READY.md`
- **Env checklist:** `PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- **iOS release:** `docs/IOS_RELEASE.md`
- **Android signing:** `client/android/keystore/SIGNING_STEPS.md`
- **Odds V2 migration:** Run `server/migrations/324_prediction_odds_model.sql` in Supabase if you use Odds V2

---

## Summary

- **Web:** Autodeploy triggered by push to `main`; confirm in Render and Vercel.
- **iOS:** Build and sync done; you archive in Xcode and upload to App Store Connect.
- **Android:** `app-release.aab` is built; you upload it in Play Console.

No further automated steps are available; the remaining steps require your credentials and store consoles.
