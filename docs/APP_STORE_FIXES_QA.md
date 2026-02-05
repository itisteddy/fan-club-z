# App Store fixes (Guidelines 2.1 & 1.2) — Summary & QA

## A) Guideline 2.1 Performance — Crash on “Edit profile → Take photo” (iPadOS)

### Root cause
- **TCC crash**: App accessed Camera without `NSCameraUsageDescription` in Info.plist (and related photo keys).

### Changes made
- **File**: `client/ios/App/App/Info.plist`
- **Added keys** (verbatim):
  - **NSCameraUsageDescription**: `Fan Club Z uses the camera to take profile photos and prediction cover images.`
  - **NSPhotoLibraryUsageDescription**: `Fan Club Z needs access to your photo library to set your profile photo or add images to predictions.`
  - **NSPhotoLibraryAddUsageDescription**: `Fan Club Z can save photos to your library when you take a profile or prediction image.`

### Take Photo flow (unchanged)
- Edit Profile → “Upload image” uses `<input type="file" accept="image/*">`. On iOS this can show “Take Photo” or “Photo Library”. Permission is requested by the system when the user chooses “Take Photo”; with the new plist keys the app no longer crashes.

### QA checklist (A)
- [ ] **iPad**: Clean install → Profile → Edit Profile → tap “Upload image” → choose **Take Photo** → allow Camera → take photo → save. No crash; photo appears on profile.
- [ ] **iPad**: Same flow → choose **Photo Library** → select image. No crash.
- [ ] **iPhone**: Repeat both flows.

---

## C) Guideline 2.1 — App completeness bugs

### C1 — Delete account (“Database error deleting user”)

**Root cause**: Server called `auth.admin.deleteUser` first; on failure it returned Supabase’s raw message (e.g. “Database error”). The `users` table update could also fail and surface a technical message.

**Fix**:
- **File**: `server/src/routes/users.ts`
- **Logic**: (1) Anonymize `users` row first (username, full_name, avatar_url), then (2) call `auth.admin.deleteUser`.
- **Response**: On any failure return a single user-facing message: `Account deletion failed. Please try again or contact support.` (no raw DB/auth messages).

**QA (C1)**:
- [ ] **iPad**: Profile → Delete account → type DELETE → confirm. Expect success and sign-out (or the same friendly error if backend still fails).
- [ ] If it still fails, error text must be the friendly message above, not “Database error deleting user”.

---

### C2 — Email sign-up after confirmation

**Root cause**: Can be redirect URL mismatch, session not establishing in Safari/WebView, or expired/invalid link.

**Fix**:
- **File**: `client/src/pages/auth/AuthCallback.tsx`
- **Changes**: Clearer error when no code/token in URL; error copy: “This sign-in link is invalid or has expired. Please request a new link from the sign-in screen.”
- **Recovery**: Error view has “Back to Home (then try sign-in again)” so user can retry or request a new link.

**Supabase (manual)**:
- In **Authentication → URL Configuration**, ensure **Redirect URLs** include:
  - Web: `https://app.fanclubz.app/auth/callback` (and localhost for dev).
  - iOS: `fanclubz://auth/callback` if using native deep links for email links.

**QA (C2)**:
- [ ] **Web**: Request magic link → open link in same browser → should land on app and be signed in (or see the new error + recovery).
- [ ] **iPad Safari**: Request magic link → open link in Mail → opens Safari/app → confirm session establishes or new error + “Back to Home” works.

---

### C3 — “Make your first deposit” / Deposit CTA does nothing

**Root cause**: On iOS, crypto is disabled for client (`isCryptoEnabledForClient() === false`). The main “Deposit” button called `handleDeposit` → `ensureWalletReady()`, which returns false when wallet is disconnected, so nothing visible happened.

**Fix**:
- **File**: `client/src/pages/WalletPageV2.tsx`
- **Logic**:
  - `handleDepositCTA`: If crypto disabled for client (e.g. iOS), open fiat deposit if `fiatEnabled`, else show toast: “Add funds on the web app or when NGN deposits are available.”
  - When `!isCryptoEnabledForClient()`, the main action buttons are: primary “+ Deposit” / “Add funds” (calls `handleDepositCTA`), and “Withdraw” (fiat) if fiat is enabled.

**QA (C3)**:
- [ ] **iPad**: Sign in → Wallet. Tap main “Deposit” / “Add funds”. Either fiat deposit sheet opens (if NGN enabled) or an info toast appears. No dead tap.
- [ ] **iPhone**: Same.
- [ ] **Web**: Deposit/Withdraw behavior unchanged (crypto flow).

---

## B) Guideline 1.2 Safety — UGC (User-Generated Content)

**Scope**: Filtering, reporting, blocking, and admin moderation. Not fully implemented in this pass.

**Already in place**:
- **Blocking**: `user_blocks` table; `POST/GET/DELETE /api/v2/users/me/block`; client `useBlockedUsers` and block from profile.
- **Moderation**: Admin Moderation page and related hooks.

**To reach full 1.2 compliance (future work)**:
1. **Reports**: Table + API for reporting predictions/comments/profiles; “Report” in UI; instant hide for reporter.
2. **Text filter**: Lightweight filter on create/update for title, description, username, bio, comments; configurable blocklist and user-facing error.
3. **Admin moderation queue**: List reports, view content, actions (hide/remove, suspend user), audit log.
4. **Hidden flags**: e.g. `predictions.hiddenAt`, `comments.hiddenAt`, `users.suspendedAt` and wiring in feeds/queries.

---

## Files changed (this pass)

| Area | File |
|------|------|
| A | `client/ios/App/App/Info.plist` |
| C1 | `server/src/routes/users.ts` |
| C2 | `client/src/pages/auth/AuthCallback.tsx` |
| C3 | `client/src/pages/WalletPageV2.tsx` (and `client/src/lib/cryptoFeatureFlags.ts` import) |

---

## Final QA checklist (App Store resubmission)

- [ ] **A** — iPad: Edit Profile → Take Photo and Photo Library: no crash; plist strings shown in system permission dialogs.
- [ ] **C1** — Delete account: success or single friendly error message.
- [ ] **C2** — Email sign-up: magic link completes sign-in or shows new error + “Back to Home”.
- [ ] **C3** — Wallet Deposit CTA on iPad/iPhone: always opens fiat sheet or shows info toast (never no response).
- [ ] No regressions on web (Deposit/Withdraw, OAuth, delete account).
