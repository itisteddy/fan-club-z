# Google Play Store — Submission Notes (Fan Club Z)

This file is a **starting point** for Play Console submission. It is generated from the repo’s current feature set and should be reviewed/edited before submission.

## App identity

- **App name**: Fan Club Z
- **Package name (applicationId)**: `com.fanclubz.app`
- **Android project**: `client/android`
- **Versioning**
  - `versionName`: `1.0.0`
  - `versionCode`: `1` (MUST increase every release)
  - File to update: `client/android/app/build.gradle`

## Store listing text (edit)

### Short description (max 80 chars)

`__TODO__`

### Full description

`__TODO__`

## Privacy policy URL

`__TODO: https://...__`

## Feature / policy flags (based on current code)

### Account creation / login

- **Yes** — uses Supabase auth (`@supabase/supabase-js`) with email/password and OAuth providers.
  - Key code: `client/src/lib/supabase.ts`

### User-generated content (UGC)

- **Yes** — the app includes user content such as:
  - Predictions created by users
  - Comments on predictions
  - Profile fields (e.g. username, avatar)
  - Key code: `client/src/store/commentStore.ts`, `client/src/lib/supabase.ts`

### Payments / crypto

- **Yes** — the app includes **crypto wallet** functionality and USDC deposit/withdraw flows.
  - Wallet providers: wagmi / WalletConnect
  - Example UI: `client/src/components/wallet/DepositUSDCModal.tsx`
  - Note: the app contains a “store-safe” policy gate for wallet features (`client/src/lib/storeSafePolicy.ts`).

### Analytics / crash reporting

- **Optional / conditional**
  - Web vitals sampling exists (`client/src/lib/vitals.ts`)
  - Sentry integration exists, **only enabled in production when `VITE_SENTRY_DSN` is set** (`client/src/utils/errorMonitoring.ts`)

## Data safety checklist (recommendations)

This section is intentionally conservative. Confirm what is actually collected/stored in production.

### Data types likely handled

- **Personal info**
  - Email (account login)
  - Username / profile info
  - Profile avatar URL
- **User-generated content**
  - Predictions and comments text
- **Financial / payment info (crypto)**
  - Wallet address
  - On-chain transaction hashes (deposit/withdraw logs)
- **Diagnostics**
  - Crash reports / performance data (if Sentry enabled)
  - Performance metrics (web vitals)

### Data collection & sharing (what to decide in Play Console)

- **Collected**: likely yes (account + content + wallet)
- **Shared**: depends on vendors enabled (e.g., Sentry) and how you define “sharing”
- **Data encrypted in transit**: expected yes (HTTPS to Supabase / API)
- **Data deletion request**: define your process

## Content moderation (only claim what exists)

UGC implies Play Console will expect moderation controls. In this repo there is an admin moderation surface (e.g. `client/src/pages/admin/ModerationPage.tsx`), but confirm:

- How users **report** content/users
- How you **remove** content/users
- How you handle **repeat offenders**
- Whether you support **blocking** users

## Reviewer instructions (fill in)

### Test account

- Email: `__TODO__`
- Password: `__TODO__`

### Notes to reviewer

- `__TODO__`

### If a wallet/crypto flow is part of the core experience

- Provide a tester wallet setup guide, or explicitly state how the reviewer can evaluate the app without real funds.

