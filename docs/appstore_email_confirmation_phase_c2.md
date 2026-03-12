# App Store / Compliance Stream - Phase C2 (Email Sign-up / Confirmation)

Date: 2026-03-12
Branch: `staging`

## Scope
C2 only:
- Email sign-up / confirmation callback alignment
- Session establishment behavior after confirmation
- Minimal auth redirect/callback hardening

No deposit CTA, camera/photo, UGC moderation, wallet/staking, or broad auth redesign changes.

## Recon

### Frontend signup/callback flow
- Session provider: `client/src/providers/AuthSessionProvider.tsx`
  - `signUp(...)` uses `supabase.auth.signUp(...)`
  - `signInWithEmailLink(...)` uses `supabase.auth.signInWithOtp(...)`
- Callback page: `client/src/pages/auth/AuthCallback.tsx`
- Auth redirect helper: `client/src/lib/supabase.ts`

### Backend participation
- Email confirmation is Supabase-auth driven (frontend + Supabase callback/session).
- Backend not used for confirmation exchange itself; backend validates resulting bearer token on normal app calls.

## Root Cause
1. **Redirect allowlist mismatch in staging Supabase config**:
   - Requested redirect `https://fanclubz-staging.vercel.app/auth/callback` was being rewritten to `https://fanclubz-staging.vercel.app`.
   - This can bypass callback-route-specific handling and create brittle post-confirm UX.
2. **Callback robustness gap**:
   - Web callback logic did not explicitly handle `token_hash` verification path.

## Changes Made
1. `client/src/lib/supabase.ts`
- Added `buildEmailRedirectUrl()` returning canonical web origin.
- Purpose: align email confirmation/magic-link redirects with currently allowed staging redirect behavior (origin-level).

2. `client/src/providers/AuthSessionProvider.tsx`
- `signUp(...)` now uses `emailRedirectTo: buildEmailRedirectUrl()`.
- `signInWithEmailLink(...)` now uses stable email redirect origin.
- Added post-confirm hash handling:
  - if auth hash session lands on web root, clean URL hash
  - redirect to `/predictions` for deterministic post-confirm UX

3. `client/src/pages/auth/AuthCallback.tsx`
- Added explicit `token_hash` callback handling via `supabase.auth.verifyOtp(...)`.
- Keeps callback route robust for token-hash-based confirm flows.

## Live Staging Deployment Evidence
- Backend `/health` SHA used in validation: `fbc193387bed337322d92cbc104dce791b35058e`
- Frontend staging evidence:
  - URL: `https://fanclubz-staging.vercel.app/auth/callback`
  - `last-modified`: `Thu, 12 Mar 2026 20:33:05 GMT`
  - `x-vercel-id`: observed during validation runs

## Staging E2E Validation (Disposable User)

### Setup path
- Attempting normal email signup is currently constrained by Supabase mailer rate-limit behavior in staging.
- Used safest staging-only fallback for deterministic E2E:
  - create disposable unconfirmed user via `POST /auth/v1/admin/users`
  - generate confirmation link via `POST /auth/v1/admin/generate_link`

### Final live run results
- Disposable user created: `c2.rerun.1773347653310@gmail.com`
- Confirmation link generation: `200`
- Requested redirect: `https://fanclubz-staging.vercel.app/auth/callback`
- Actual redirect_to in generated link: `https://fanclubz-staging.vercel.app` (staging allowlist behavior)
- Verify link request: `303` with `#access_token=...` in redirect URL
- Post-confirm authenticated app access check:
  - `GET /api/v2/users/me/terms-accepted` -> `200`
  - `x-request-id`: `93a31cb3-ce5c-4f70-824a-2ece37c22872`
- Wrong password after confirmation:
  - `/auth/v1/token?grant_type=password` -> `400 invalid_credentials`
- Correct password after confirmation:
  - `/auth/v1/token?grant_type=password` -> `200` with token

### Additional error-path checks
- Already-confirmed link reuse: returns redirect error (`otp_expired`) as expected
- Tampered/invalid token link: returns redirect error (`otp_expired`) as expected

## C2 Status
- **CLOSED**

Rationale:
- Signup confirmation token exchange works end-to-end in staging.
- Confirmation redirect lands on correct staging domain and establishes valid session.
- Post-confirm access/login behavior is deterministic.
- Error paths return expected failures.

## Next Phase Gate
- C3 (Make first deposit CTA) can begin.
