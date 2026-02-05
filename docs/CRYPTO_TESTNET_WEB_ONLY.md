# Crypto testnet: web-only gating

Crypto (testnet) is enabled **only for the web client** (https://app.fanclubz.app). Native apps (iOS/Android) do not show crypto UI, and the server rejects crypto requests from non-web clients.

## Layers

1. **Client identification** – Every request from the web app sends `X-FCZ-Client: web`. Native sends `ios` or `android`.
2. **Server gating** – Crypto endpoints require `CRYPTO_MODE=testnet` and `req.client` in `CRYPTO_ALLOWED_CLIENTS` (default `web`). Optional: `Origin` must match `CRYPTO_ALLOWED_ORIGIN`.
3. **UI gating** – Crypto rail, Connect Wallet, deposit/withdraw crypto are shown only when `isCryptoEnabledForClient()` is true (web + testnet env).

## Env vars

### Render (server)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `CRYPTO_MODE` | Yes | `testnet` | `off` \| `testnet` \| `mainnet`. Use `testnet` for web-only crypto. |
| `CRYPTO_ALLOWED_CLIENTS` | No | `web` | Comma-separated: `web`, `ios`, `android`, `admin`. Default `web`. |
| `CRYPTO_ALLOWED_ORIGIN` | No | `https://app.fanclubz.app` | If set, crypto allowed only when `Origin` matches. |
| `CRYPTO_MAINNET_CHAIN_ID` | If mainnet | – | Required if `CRYPTO_MODE=mainnet` (fail-fast). |
| `CRYPTO_MAINNET_RPC_URL` | If mainnet | – | Required if `CRYPTO_MODE=mainnet` (fail-fast). |

### Vercel (client, web app)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_CRYPTO_MODE` | No | `testnet` | `off` \| `testnet` \| `mainnet`. Or use `VITE_FCZ_BASE_BETS=1` (legacy). |
| `VITE_FCZ_BASE_BETS` | No | `1` | Legacy: same effect as `VITE_CRYPTO_MODE=testnet` for UI. |
| `VITE_FCZ_BASE_ENABLE` | No | `1` | Enables Base/crypto UI when client is allowed. |

For **web-only testnet**: set `CRYPTO_MODE=testnet` and `CRYPTO_ALLOWED_CLIENTS=web` on the server; set `VITE_CRYPTO_MODE=testnet` or `VITE_FCZ_BASE_BETS=1` on the web app build. Do **not** set these on native app builds (or set `VITE_CRYPTO_MODE=off`) so native stays demo/fiat-only.

## Files changed

### Client

- `client/src/lib/apiClient.ts` – `getFczClientHeader()`, `X-FCZ-Client` on every request.
- `client/src/lib/cryptoFeatureFlags.ts` – **New.** `getCryptoFeatureFlags()`, `isCryptoEnabledForClient()`.
- `client/src/lib/wagmi.ts` – WalletConnect/connectors gated by `isCryptoEnabledForClient()`.
- `client/src/components/prediction/PredictionActionPanel.tsx` – Crypto bet UI gated by `isCryptoEnabledForClient()`.
- `client/src/components/predictions/PlacePredictionModal.tsx` – Crypto mode gated by `isCryptoEnabledForClient()`.
- `client/src/pages/UnifiedWalletPage.tsx` – Crypto rail gated by `isCryptoEnabledForClient()`.

### Server

- `server/src/config/index.ts` – `crypto.mode`, `crypto.allowedClients`, `crypto.allowedOrigin`; fail-fast if `CRYPTO_MODE=mainnet` without mainnet config.
- `server/src/middleware/clientId.ts` – **New.** Reads `X-FCZ-Client`, sets `req.client`.
- `server/src/middleware/requireCryptoEnabled.ts` – **New.** `requireCryptoEnabled(mode)`, `isCryptoAllowedForClient(req)`.
- `server/src/index.ts` – `clientIdMiddleware`; CORS `X-FCZ-Client`; `/api/escrow` uses `requireCryptoEnabled('testnet')`.
- `server/src/routes/predictions.ts` – POST `:id/entries`: crypto path (escrowLockId) checks `isCryptoAllowedForClient(req)`.
- `server/src/routes/predictions/placeBet.ts` – `fundingMode === 'crypto'` checks `isCryptoAllowedForClient(req)`.
- `server/src/routes/settlement.ts` – `cryptoGate(req, res)` at start of: `GET /claimable`, `GET /:predictionId/merkle-proof`, `GET /:predictionId/leaves`, `POST /manual/merkle`, `POST /manual/merkle/posted`.

## Manual test checklist

### Web app (allowed)

1. Set server: `CRYPTO_MODE=testnet`, `CRYPTO_ALLOWED_CLIENTS=web`. Set client (Vercel): `VITE_CRYPTO_MODE=testnet` or `VITE_FCZ_BASE_BETS=1`.
2. Open https://app.fanclubz.app in a browser. Confirm crypto rail / Connect Wallet / deposit–withdraw are visible.
3. Place a crypto bet (or call escrow lock). Confirm 200.
4. Call with header:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" -H "X-FCZ-Client: web" -H "Origin: https://app.fanclubz.app" \
     https://YOUR_API/api/escrow/lock -X POST -H "Content-Type: application/json" -d '{"user_id":"...","prediction_id":"...","amount":1}'
   ```
   Expect 400/409 (validation) or 200, **not** 403.

### Native / no header (rejected)

1. Call without `X-FCZ-Client` or with `X-FCZ-Client: ios`:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     https://YOUR_API/api/escrow/lock -X POST -H "Content-Type: application/json" -d '{"user_id":"...","prediction_id":"...","amount":1}'
   ```
   Expect **403** and body `{"error":"crypto_disabled_for_client",...}`.

2. With `X-FCZ-Client: ios`:
   ```bash
   curl -s -H "X-FCZ-Client: ios" https://YOUR_API/api/v2/settlement/claimable?address=0x...
   ```
   Expect **403** and `crypto_disabled_for_client`.

### CRYPTO_MODE=off

1. Set server: `CRYPTO_MODE=off`. Restart.
2. Call with `X-FCZ-Client: web` on `/api/escrow/lock` or `/api/v2/settlement/claimable`. Expect **403** everywhere for crypto.

### Fail-fast (mainnet)

1. Set server: `CRYPTO_MODE=mainnet` and **do not** set `CRYPTO_MAINNET_CHAIN_ID` / `CRYPTO_MAINNET_RPC_URL`.
2. Start server. Expect process to **exit** with error: `CRYPTO_MODE=mainnet requires CRYPTO_MAINNET_CHAIN_ID and CRYPTO_MAINNET_RPC_URL`.
