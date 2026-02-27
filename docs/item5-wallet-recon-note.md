# Item 5 Recon Note (Wallet UX)

Canonical wallet/auth stack and active files:

- Connectors are defined in `client/src/lib/wagmi.ts`
  - `injected`
  - `walletConnect`
  - optional `coinbaseWallet`
- Wallet connect entrypoint used by wallet pages is the global event:
  - `window.dispatchEvent(new CustomEvent('fcz:wallet:connect'))`
  - consumed by `client/src/components/wallet/ConnectWalletSheet.tsx`
- Connection orchestration (state machine + deep link helpers) is implemented in:
  - `client/src/lib/wallet/connectOrchestrator.ts`
- Wallet connection controller API for UI surfaces is implemented in:
  - `client/src/lib/wallet/useWalletConnectionController.ts`
- Native OAuth callback handling is implemented in:
  - `client/src/lib/auth/nativeOAuth.ts`
  - listener wiring lives in `client/src/lib/supabase.ts`
- Browser/in-app/native context detection is implemented in:
  - `client/src/lib/browserContext.ts`

Root causes found:

1. Wallet modal layering conflict:
   - `.z-modal` stack level was below app shell/nav layers in some flows.
   - this can make wallet actions appear visible but not reliably tappable.
2. WalletConnect mobile handoff timing:
   - transient relay/socket errors during app/tab backgrounding were treated as hard failures too early.
   - recovery path needed extra reconnect polling after visibility restore (web + native).
3. Native runtime detection drift after logout:
   - brief Capacitor bridge lag can misclassify native webview as in-app browser.
   - this can block auth UX and contribute to sign-out/sign-in regressions.
4. Build/runtime config drift:
   - `VITE_BUILD_TARGET` not always injected deterministically from Vite mode.
   - wallet/native fallback logic became less reliable across bundles.

## Minimal Item 5 Patch Set

Ship these files together to keep wallet/auth flow consistent:

- `client/src/components/wallet/ConnectWalletSheet.tsx`
- `client/src/lib/wallet/connectOrchestrator.ts`
- `client/src/lib/wallet/useWalletConnectionController.ts`
- `client/src/lib/wallet/walletConfig.ts`
- `client/src/lib/wagmi.ts`
- `client/src/index.css`
- `client/src/lib/supabase.ts`
- `client/src/components/profile/SignOutButton.tsx`
- `client/src/providers/AuthSessionProvider.tsx`
- `client/src/store/authStore.ts`
- `client/src/lib/browserContext.ts`
- `client/src/config/native.ts`
- `client/vite.config.ts`
- `docs/wallet-qa.md`

Build gate used:

- `npm --prefix client run build` (pass)
