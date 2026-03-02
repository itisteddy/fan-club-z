# Fix: Bet Placement Disabled Error

## Problem
Bet placement returns 403 Forbidden: "Bet placement is currently disabled" even when there's available balance.

## Root Cause
The server `/api/predictions/:predictionId/place-bet` endpoint checks for `ENABLE_BETS` environment variable, but it's not set in `server/.env`.

## Solution

Add to `server/.env`:

```bash
# Enable bet placement
ENABLE_BETS=1
ENABLE_BASE_BETS=1
```

## Steps

1. Open `server/.env`
2. Add the lines above
3. Restart the server:
   ```bash
   cd server
   npm run dev
   ```

## Verification

After restart, check the server console. You should see:
- `[FCZ-BET] Place bet request:` logs when attempting to place a bet
- No more "Bet placement is currently disabled" errors

The server checks for any of these flags:
- `process.env.ENABLE_BETS === '1'`
- `process.env.VITE_FCZ_BASE_BETS === '1'`  
- `process.env.ENABLE_BASE_BETS === '1'`

