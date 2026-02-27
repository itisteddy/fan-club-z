# Wallet QA Matrix (Item 5)

## Platforms

- iOS Safari
- iOS Chrome
- Android Chrome
- Android Brave
- MetaMask in-app browser (Android/iOS where available)
- Fan Club Z native Android build
- Fan Club Z native iOS build

## Latest Verification Snapshot

| Platform | Status | Notes |
|---|---|---|
| iOS Safari | Pending | Run after deploy with new connect sheet/orchestrator changes. |
| iOS Chrome | Pending | Run after deploy with deep-link gesture fixes. |
| Android Chrome | Pending | Primary focus for "wallet opens but app stays disconnected" case. |
| Android Brave | Pending | Validate WalletConnect open/copy fallback actions. |
| MetaMask in-app browser | Pending | Must prefer injected connector and avoid WalletConnect-first flow. |
| Fan Club Z native Android build | In progress | Native runtime/auth reset fixes added; validate logout->login and WC reconnect. |
| Fan Club Z native iOS build | Pending | Validate app-state resume polling and auth callback path. |

## Checklist

1. Injected wallet in MetaMask browser connects on first try.
2. WalletConnect flow on mobile web:
   - connect sheet opens
   - buttons are tappable
   - `Open Wallet App` opens wallet
   - `Copy connection link` copies URI
3. Connection states are correct:
   - Disconnected -> Connecting -> Connected
   - no stuck spinner without retry/reset actions
4. Retry/reset:
   - `Try again` retries current method
   - `Reset` clears stale session and allows fresh reconnect
5. Wrong chain:
   - user sees switch network path
   - switch resolves to Base Sepolia
6. Disconnect and reconnect:
   - disconnect works
   - reconnect works without page reload
7. Native auth logout/login:
   - sign out
   - sign in again (email + Google path where applicable)
   - callback completes and returns into app
8. No blocking console/runtime errors in wallet journey.

## Notes

- For native app builds, ensure one of the following is set:
  - `VITE_WALLETCONNECT_PROJECT_ID`
  - `VITE_WC_PROJECT_ID` (legacy alias)
  - `VITE_REOWN_PROJECT_ID` (alias)
- Runtime override (for emergency validation only):
  - `localStorage['fcz.walletconnect.projectId'] = '<project-id>'`
- Wallet metadata/redirect domain should use canonical app URL:
  - `https://app.fanclubz.app`

## Android Native Runbook

1. Fresh start:
   - force stop app
   - relaunch app
2. Wallet flow:
   - open Wallet page
   - tap `Connect wallet`
   - choose wallet and approve in wallet app
   - return to app
   - expected: sheet transitions to `Wallet connected`, then closes
3. Recovery flow:
   - if still in `Waiting for wallet...`, use `Try again` once
   - if stale, use `Reset` then reconnect
4. Auth flow:
   - sign out
   - sign in again
   - expected: callback returns to app and profile loads

### Android log capture

```bash
adb logcat -c
adb shell monkey -p com.fanclubz.app -c android.intent.category.LAUNCHER 1 >/dev/null
adb logcat -d | rg -n "Orchestrator|WalletConnect|Connect Wallet|nativeOAuth|appUrlOpen|auth-in-progress|connector_not_found|Connection timed out|project ID" | tail -n 300
```

## iOS Runbook

1. Safari and Chrome:
   - open wallet connect flow from `/wallet`
   - verify modal controls are tappable
   - verify wallet deep-link opens selected wallet
2. In-app browser (MetaMask/Coinbase):
   - verify injected connect path is selected first
   - verify no WalletConnect-only dead-end
3. Auth:
   - sign out and sign in
   - verify callback closes browser and returns to app
