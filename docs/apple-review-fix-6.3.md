# Apple Review Fix 6.3: App Completeness (Delete Account, Email Confirmation, Deposit CTA)

## Root causes and fixes

## 1) Delete account error
- Root cause: delete endpoint existed, but profile UI did not expose a complete confirm -> execute flow.
- Fix:
  - Added explicit `Delete account` action on self-profile.
  - Added confirmation modal with in-flight state.
  - Calls `POST /api/v2/users/me/delete`, signs out, and routes home on success.

## 2) Email sign-up after confirmation fails
- Root cause: callback handler expected OAuth `code`/token sessions and did not fully handle `token_hash + type` email confirmation flows.
- Fix:
  - Added `verifyOtp({ token_hash, type })` handling in auth callback flow.
  - Kept callback idempotency and session verification checks.

## 3) “Make your first deposit” no response
- Root cause: deposit CTA had contexts where no modal/flow was opened, leaving the action feeling dead.
- Fix:
  - Hardened deposit handler in unified wallet flow:
    - opens fiat deposit when available
    - opens connect wallet when crypto is enabled but disconnected
    - opens explicit “Deposit unavailable here” sheet when funding is unsupported in current runtime.

## Files
- `client/src/pages/ProfilePageV2.tsx`
- `client/src/pages/auth/AuthCallback.tsx`
- `client/src/pages/UnifiedWalletPage.tsx`

## Validation checklist
1. Self profile -> Delete account -> confirm -> account soft-deletes and signs out.
2. Sign up with email -> click confirmation link -> callback completes and session is valid.
3. Wallet page deposit CTA always produces visible response (sheet/modal/navigation).
4. Repeat #3 on iOS, Android, and web.
