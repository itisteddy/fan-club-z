# Parity audit (Android ↔ iOS) — Fan Club Z

Product requirement: **same user-visible behavior across platforms by default**, unless an OS-specific exception is required.

## Checklist (enforced)

- **Default wallet mode is Demo Credits after login**
  - **Source of truth**: server (`public.users.wallet_mode`, default `demo`)
  - **Client cache**: `zustand` persisted store (`fcz:fundingMode`) is treated as a cache; bootstrap overwrites from server when present.
  - **Files**
    - Client bootstrap sync: `client/src/App.tsx`
    - Client server accessors: `client/src/lib/walletModeSettings.ts`
    - DB migration: `server/migrations/317_users_wallet_mode.sql`
    - Demo wallet UI (server-backed): `client/src/pages/UnifiedWalletPage.tsx` + `server/src/routes/demoWallet.ts`

- **OAuth login returns to the app route correctly**
  - **Redirect scheme**: `fanclubz://auth/callback` (shared iOS + Android)
  - **Android**: `intent-filter` handles callback and `appUrlOpen` listener completes PKCE exchange
  - **Files**
    - Android intent filter: `client/android/app/src/main/AndroidManifest.xml`
    - Listener bootstrap: `client/src/main.tsx`
    - PKCE exchange: `client/src/lib/auth/nativeOAuth.ts`
    - OAuth redirect selection: `client/src/lib/supabase.ts`, `client/src/config/native.ts`

- **Safe area / notch handling**
  - **Unified CSS variable**: `--app-safe-top`
  - **Android native injects** top inset via WindowInsets into WebView
  - **Files**
    - Android insets injection: `client/android/app/src/main/java/com/fanclubz/app/MainActivity.java`
    - CSS var foundation: `client/src/index.css`
    - Header + overlays: `client/src/components/navigation/TopHeader.tsx`, `client/src/components/layout/Header/Header.tsx`, `client/src/App.tsx`, `client/src/styles/pwa.css`

- **Feature flags / environment config parity**
  - **Rule**: runtime detection is authoritative for native behavior; store-safe policy only applies for iOS store-safe builds.
  - **Files**
    - Store-safe policy: `client/src/lib/storeSafePolicy.ts`
    - Funding mode defaults: `client/src/store/fundingModeStore.ts`
    - Wallet variant resolver: `client/src/config/walletVariant.ts`

