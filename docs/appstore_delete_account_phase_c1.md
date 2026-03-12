# App Store / Compliance Stream - Phase C1 (Delete Account Flow)

Date: 2026-03-12
Branch: `staging`

## Scope
Implemented only delete-account flow wiring:
- Delete account UI entry + confirmation/loading/error states
- Backend delete handler idempotency and structured response hardening
- Sign-out after successful deletion

No wallet/staking/leaderboard/prediction flow/business-logic changes.

## Recon Findings

### Current UI entry point (before fix)
- Active profile page: `client/src/pages/ProfilePageV2.tsx`
- **No delete-account action existed** in this page before C1.
- Result: users could not initiate a compliant in-app delete flow.

### Current backend handler
- Endpoint: `POST /api/v2/users/me/delete`
- File: `server/src/routes/users.ts`
- Existing behavior: soft-delete/anonymize user profile fields.

### Root cause
1. Frontend root cause: delete-account UI path was missing in the active profile page.
2. Backend consistency issue: route used `requireSupabaseAuth`, which blocks deleted users before route-level idempotency check; route-level "already deleted" success path was effectively unreachable.
3. UX/session gap: after successful deletion, no explicit forced client sign-out was wired from profile UI.

## Changes Made

### Frontend
- `client/src/pages/ProfilePageV2.tsx`
  - Added `Delete account` CTA for authenticated own-profile view.
  - Added confirmation modal with:
    - cancel
    - destructive confirm action
    - loading state (`Deleting…`)
    - inline structured error message
  - Added delete handler calling `POST /api/v2/users/me/delete`.
  - On success (and 409 deleted idempotent case), force local logout and redirect to `/`.

### Backend
- `server/src/routes/users.ts`
  - Changed middleware for delete endpoint from `requireSupabaseAuth` to `requireSupabaseAuthAllowDeleted`.
  - Preserved soft-delete behavior.
  - Made idempotent response reachable and structured:
    - `data.accountStatus`
    - `data.alreadyDeleted`
    - `data.signedOutRequired`

## Validation

### Local build/test
- `npm --prefix server run build` -> PASS
- `npm --prefix client run build` -> PASS
- `npm --prefix server run test -- accountStatus.test.ts` -> PASS

### Staging API smoke (unauthenticated error path)
Command:
- `curl -D - -o /tmp/c1_delete_noauth_body.json -X POST https://fanclubz-backend-staging.onrender.com/api/v2/users/me/delete`

Observed:
- HTTP: `401`
- Body: `{ "error": "unauthorized", "message": "Authorization required" }`
- `x-request-id`: `9cecbab0-42f6-48c3-92b1-68644ad47fb2`

### Full authenticated staging delete-flow (disposable user)
Status: **Completed (API-level E2E)**.

Disposable user setup:
- Attempted normal staging signup first (`/auth/v1/signup`) with disposable address.
- Normal signup was blocked in staging due Supabase email throttle (`429 over_email_send_rate_limit`), so used staging-only fallback:
  - `POST /auth/v1/admin/users` (service-role) with `email_confirm: true` for a disposable account.
- Disposable user created:
  - email: `c1.delete.1773345845461@gmail.com`
  - userId: `fee329fe-74a4-4a96-a08f-f86a937dcad3`

Exact E2E steps/results:
1. Sign in disposable user (`/auth/v1/token?grant_type=password`) -> `200`, token issued.
2. Pre-delete app access probe (`GET /api/v2/users/me/terms-accepted`) -> `200`
   - `x-request-id`: `25f99479-b2c9-46bc-91c9-c0681f1081b6`
3. Delete account (`POST /api/v2/users/me/delete`) -> `200`
   - `x-request-id`: `0f6fb93e-f456-4e2c-9d13-52d46da68518`
   - body: `{ "success": true, "message": "Account deleted", "version": "2.0.78" }`
4. Verify old session cannot continue normal use:
   - `GET /api/v2/users/me/terms-accepted` with same token -> `409 ACCOUNT_DELETED`
   - `x-request-id`: `f5b599f6-f685-4d01-87f6-adfb493ec56b`
5. Re-login behavior:
   - password login still succeeds (`200`, token issued) as intended for restore flow
   - first gated app call returns `409 ACCOUNT_DELETED`
   - `x-request-id`: `06038891-c0ec-4734-9708-5383d38f3738`
6. Repeated delete while already deleted (current deployed backend behavior):
   - `POST /api/v2/users/me/delete` -> `409 ACCOUNT_DELETED`
   - `x-request-id`: `2bb4c39e-eca1-40d1-9ac1-0c4812d6ce5e`

Notes:
- Current staging backend SHA at test time: `b04e48b4d33e26a7c93f28f0b8e394147e92cb30`.
- The idempotent `200` on repeated delete will be active once this C1 backend patch is deployed (route now uses `requireSupabaseAuthAllowDeleted`).
- C1 code commit pushed to staging branch: `fbc19338`. Staging backend had not yet advanced to this SHA during the validation window above.

### UI state validation
- Implemented in `ProfilePageV2`:
  - confirmation modal
  - loading state (`Deleting…`)
  - clear error text
  - success path signs out + redirects
- API-level staging E2E confirms backend/session behavior.

## Production-safety Notes
- Deletion remains soft-delete/anonymization (no hard-delete FK risk introduced).
- Deleted accounts still support restore flow via existing `POST /api/v2/users/me/restore` path.

## C1 Status
- **Open (deployment parity pending)**: authenticated staging E2E passed on current live backend, and C1 patch is pushed, but staging backend SHA must advance to `fbc19338` (or newer) and be rerun once to close formally.
