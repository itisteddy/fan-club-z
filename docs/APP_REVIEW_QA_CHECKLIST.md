# App Review QA Checklist (Apple / Store)

Use this checklist before submitting for review and for regression after updates.

---

## 1. Terms & Privacy

- [ ] **iPad**: Open app → find Terms of Service link → tap once. Link opens correct URL (in-app or external) every time.
- [ ] **iPad**: Same for Privacy Policy link.
- [ ] **iPhone**: Terms/Privacy links open correctly.
- [ ] **Web**: Terms/Privacy links work from landing and in-app surfaces.

**Where to test**: Landing page footer, Support/Help, Legal layout (`/terms`, `/privacy`).

**Phase 1 manual verification (Terms/Privacy link fix):**
1. On iPad (or iPad Simulator): Go to landing page → scroll to footer “Legal” → tap “Privacy Policy”. Document should open (same tab or in-app browser). Repeat for “Terms of Service”.
2. Repeat from Support page (“Helpful links”) and from Legal layout nav/footer.
3. If any tap does nothing, check console for errors; links now use `openExternalUrl` (programmatic anchor click or Capacitor Browser).

---

## 2. Notch / Safe area (iOS)

- [ ] **iPhone with notch**: Notifications screen — back button fully visible and tappable (not under notch/dynamic island).
- [ ] **iPhone**: Header uses safe area inset; no content obscured by status bar or home indicator.
- [ ] **iPad**: Top bar / header layout correct; no overlap with system UI.

**Where to test**: Notifications page header, any screen with sticky header + back button.

**Phase 1 regression (Notification header safe area):**
1. Open Notifications screen on iPhone with notch (or Simulator: iPhone 14/15 Pro).
2. Confirm header has top padding so content sits below status/notch; back (arrow) button is fully in the safe tappable region (≥44pt).
3. Tap back button — it should navigate back every time. If it was previously hard to tap, header now uses `pt-[env(safe-area-inset-top)]` and 44px min tap target.

---

## 3. Login & Sign in with Apple

- [ ] **Login screen**: All primary login options visible (email, Google, and when enabled: Sign in with Apple).
- [ ] **Sign in with Apple** (when `SIGN_IN_APPLE` enabled): Button present and styled per HIG; first-time login and “Hide My Email” path work; repeat login works.
- [ ] No dead ends: failed login shows clear error and retry.

**Phase 2 backend:** `POST /api/v2/auth/apple` verifies Apple identity token; client obtains session via Supabase OAuth (`signInWithOAuth('apple', { next })`) or `signInWithIdToken` for native. Server ENV: `APPLE_CLIENT_ID` or `APPLE_SERVICES_ID`, optional `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_REDIRECT_URI`.

**Phase 3 UI (Sign in with Apple button):**
1. Enable flag: set `VITE_FCZ_SIGN_IN_APPLE=1` in client env (e.g. `.env.development.local`).
2. Open auth modal (e.g. from Auth page or any “Sign in” CTA). Confirm “Sign in with Apple” button appears **above** Google, black background, white text/icon, label “Sign in with Apple”.
3. Tap target: button has `min-h-[44px]` and is tappable; `data-qa="auth-gate-apple"` for automation.
4. **Hide My Email**: If user chooses “Hide My Email” in the Apple sheet, Supabase stores the private relay; no app change required. Optional: document in Support/FAQ that we respect Apple’s private relay.
5. **Repeat login**: Sign out, then sign in again with Apple — same flow; no extra steps.
6. **Error handling**: Simulate failure (e.g. cancel Apple sheet, or network off). App should show error and retry (AuthInProgressOverlay or auth gate resolve with `status: 'error'`). User can tap Sign in again to retry.

**Where to test**: `client/src/components/auth/AuthGateModal.tsx` (Apple button when `SIGN_IN_APPLE`), `client/src/providers/AuthSessionProvider.tsx` (`signInWithApple`).

---

## 4. Account deletion

- [ ] **Discoverability**: Delete account option is easy to find (e.g. Settings / Account).
- [ ] **Flow**: Clear explanation of what deletion means; confirmation step (e.g. type DELETE or modal confirm).
- [ ] **Outcome**: Account and associated data removed; user logged out and returned to welcome/landing.

---

## 5. UGC: Reporting & blocking

- [ ] **Report**: User can report content (e.g. prediction, comment) with a reason from relevant surfaces.
- [ ] **Block**: User can block another user (e.g. from profile or content overflow).
- [ ] **Feed**: After blocking, blocked user’s content disappears from blocker’s feed immediately (or after refresh).

---

## 6. Moderation queue (admin)

- [ ] **Admin**: Open reports list; can view report details.
- [ ] **Actions**: Can remove content, ban user, or mark resolved as appropriate.
- [ ] **Effect**: Removed content no longer appears in feeds for users.

---

## 7. Disputes

- [ ] **Eligibility**: User can open “Dispute outcome” (or equivalent) only when eligible (e.g. after settlement, within time window).
- [ ] **Submit**: Dispute form submits; user sees confirmation and status.
- [ ] **Admin**: Disputes visible in admin; can resolve/reject and add notes.
- [ ] **Notification**: Submitter notified when dispute status changes.

---

## 8. Odds / payout (when ODDS_V2 enabled)

- [ ] **Clarity**: Stake, expected payout, and profit (or equivalent) clearly shown where user places a bet.
- [ ] **Consistency**: Odds / multiplier meaning consistent across cards and detail; no broken or stale values for existing predictions.

---

## 9. Wallet connect (web, when WALLET_CONNECT_V2 enabled)

- [ ] **Connect**: Single “Connect wallet” CTA; flow completes or shows clear error.
- [ ] **State**: No stuck loading; wrong network shows switch option; cancel shows retry.
- [ ] **Browsers**: Test Chrome desktop, Safari, mobile Safari; test MetaMask, WalletConnect (or primary wallets).

---

## Quick reference — where things live (codebase)

| Area            | Location |
|-----------------|----------|
| Auth            | `client/src/providers/AuthSessionProvider.tsx`, `client/src/components/auth/AuthGateModal.tsx`, `client/src/lib/supabase.ts`, `client/src/pages/auth/` |
| Terms/Privacy   | `client/src/landing/TermsPage.tsx`, `PrivacyPolicyPage.tsx`, `LegalLayout.tsx`, `LandingPage.tsx` (footer links) |
| Notifications   | `client/src/pages/NotificationsPage.tsx` (header/back), `client/src/hooks/useNotifications.ts` |
| Wallet connect  | `client/src/lib/wagmi.ts`, `client/src/components/wallet/ConnectWalletSheet.tsx`, `client/src/providers/Web3Provider.tsx` |
| UGC creation    | `client/src/pages/CreatePredictionPage.tsx`, prediction cards, comments (e.g. `client/src/features/comments`) |
| Moderation      | `server/src/routes/admin/moderation.ts`, admin UI for creators/ban |
| Disputes        | `server/src/routes/settlement.ts` (dispute endpoints), settlement UI |
| Odds/payout     | `server/src/services/payoutCalculator.ts`, `server/src/domain/payoutRules.ts`, prediction/place-bet UI |

---

*Last updated: Phase 3 — Sign in with Apple UI/UX + QA steps.*
