# Remaining Phases — Confirmation

**Purpose:** Single source of truth for what is left to do after Phase 4 (account deletion).

---

## Two “Phase” Numbering Systems in This Repo

1. **iOS/Release phasing (0–7E)** — `docs/COMPLETE_IMPLEMENTATION_PHASES_0_7.md`  
   CORS, build targets, iOS login, safe area, PWA gating, store-safe mode, privacy manifest, Apple/TestFlight.  
   **Status:** All complete (0 through 7E).

2. **Feature/Compliance phasing** — `docs/APP_REVIEW_QA_CHECKLIST.md`, `PHASE_5_*.md`  
   Auth, account deletion, badges, referrals, UGC, moderation, disputes, etc.  
   **Status:** Phase 4 (account deletion) done; Phase 5 and beyond are what’s left.

---

## ✅ Done (as of this confirmation)

| Phase | Item | Notes |
|-------|------|--------|
| Phase 2 | Backend Apple auth | `POST /api/v2/auth/apple` |
| Phase 3 | Sign in with Apple UI | Button in auth modal when `VITE_FCZ_SIGN_IN_APPLE=1` |
| Phase 4 | Account deletion | Backend `POST /api/v2/users/me/delete`; Profile “Delete account” + modal (type DELETE). Flag: `VITE_FCZ_ACCOUNT_DELETION`; now renders on iOS after rebuild + env. |

---

## 🔲 Remaining (in order)

### Phase 5 — Fixes + enable badges/referrals

**Doc:** `PHASE_5_FIXES_REQUIRED.md`, `PHASE_5_ENABLE_FEATURES.md`

| # | Task | Type | Notes |
|---|------|------|--------|
| 5.1 | **ADMIN_API_KEY** | Env (Render) | Replace placeholder with secure key; doc has suggested value. |
| 5.2 | **Frontend feature flags** | Env (Vercel) | Add `VITE_BADGES_OG_ENABLE=1`, `VITE_REFERRALS_ENABLE=1` (and redeploy). |
| 5.3 | **Referral tracking persistence** | Code | Ensure `/r/CODE` persists through signup; call attribution on signup; optional “Invited by [username]” UI. Files: `ReferralRedirectPage.tsx`, `referral.ts`, backend signup/attribution. |
| 5.4 | **Leaderboard referrals text** | Code | In `UnifiedLeaderboardPage.tsx` ~line 301: change “active · X total” to “active referrals”. |
| 5.5 | **Enable backend** | Env (Render) | Set `BADGES_OG_ENABLE=1`, `REFERRAL_ENABLE=1`, etc. per `PHASE_5_ENABLE_FEATURES.md`. |
| 5.6 | **Enable frontend** | Env (Vercel) | Flags above; redeploy. |
| 5.7 | **Test** | QA | Badges on profile/leaderboard/comments; referral flow end-to-end; wallet unchanged. |

---

### App Review / compliance (after Phase 5)

**Doc:** `docs/APP_REVIEW_QA_CHECKLIST.md` — not all named “Phase” but are the next areas to satisfy for review.

| Area | What’s needed |
|------|----------------|
| **5. UGC: Reporting & blocking** | ✅ Implemented: Report (predictions + comments); Block user (profile + API); feed/comments filtered by blocked users. Gate: `VITE_FCZ_UGC_MODERATION=1`. |
| **6. Moderation queue** | ✅ Admin Reports tab: list pending/resolved, view details, Resolve (dismiss/warn/remove/ban + notes). Creators tab: ban/unban, verify/unverify. |
| **7. Disputes** | User can dispute outcome when eligible; submit form; admin can resolve/reject; submitter notified. |
| **8. Odds/payout (ODDS_V2)** | When enabled: stake, expected payout, profit clear on bet UI; consistent across app. |
| **9. Wallet connect (WALLET_CONNECT_V2)** | When enabled: single connect CTA; clear errors; network switch/cancel retry. |

(Items 1–4 in that checklist — Terms/Privacy, safe area, Sign in with Apple, account deletion — are already covered.)

---

### Later / future

| Item | Doc | Status |
|------|-----|--------|
| **Phase 4A** | `docs/PHASE_4A_NOTIFICATIONS.md` | Notifications table + API implemented; migration and integration already documented. |
| **Phase 7B (Paystack/fiat)** | `PHASE_7_PAYSTACK_SETUP.md` | Fiat rail setup (separate from iOS 0–7E). |
| **Phase 8A Step 3** | `docs/mobile/STORE_SAFE_MODE.md` | Route guards for fiat/crypto when capabilities disabled — “Unavailable in this build” / redirect. |
| **Phase 8B** | `docs/mobile-auth-and-cors.md` | Auth/cors mobile work. |
| **Phase 8C** | `docs/mobile/STORE-CHECKLIST.md` | Future enhancements. |

---

## Summary

- **Done:** Phase 4 account deletion; Phase 5 code (referral + leaderboard); UGC reporting & blocking (report prediction/comment; block user from profile; feed and comments filtered by blocked users). Gate: `VITE_FCZ_UGC_MODERATION=1`. Run migration `322_user_blocks.sql` for block feature.
- **Next:** Phase 5 env (Render ADMIN_API_KEY, Vercel feature flags) + QA; moderation queue (admin); disputes.
