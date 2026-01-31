# Phase 1 & 2 — Verification and How to Test

## Phase 1 — Comments (Auth + Endpoint Routing)

### Code changes summary

| File | Change |
|------|--------|
| `client/src/lib/apiClient.ts` | Doc block: single canonical comments endpoints; do not retry by switching endpoints. 401/404: log exact URL; 404 message "Server endpoint not found". |
| `client/src/store/unifiedCommentStore.ts` | Comment: single canonical API only; no fallback to `/api/v2/comments/predictions/...`. |

### Canonical comments API

- **Create comment:** `POST /api/v2/social/predictions/:predictionId/comments` (only; no fallback).
- **List comments:** `GET /api/v2/social/predictions/:predictionId/comments?page=&limit=`
- **Edit/Delete:** `PUT/DELETE /api/v2/social/comments/:commentId`

All requests use `getAuthHeaders()` (Supabase session); both `fetch` (web) and `CapacitorHttp` (native) use the same auth.

### How to test (Phase 1)

1. **iOS simulator / Android**
   - Log in.
   - Open a prediction → Comments.
   - Post a comment.
   - **Confirm:** Only one `POST` to `/api/v2/social/predictions/:id/comments`; request includes `Authorization: Bearer <token>`; response 200/201; comment appears without refresh.
2. **Web**
   - Same flow in browser; confirm comment posts and appears.
3. **401**
   - With expired/missing session, post comment → server returns 401; client shows “Session expired. Please log in again.” and triggers re-auth (no retry on another URL).
4. **404**
   - If server returns 404, client shows “Server endpoint not found” and logs exact URL used (no retry by switching endpoints).

---

## Phase 2 — Lock Stake / Place Bet

### Code changes summary

| File | Change |
|------|--------|
| `server/src/routes/predictions/placeBet.ts` | Demo/fiat entry create failure: log `code` and `message` with `requestId`. All 500 responses include `requestId` and `code` (e.g. `FCZ_DATABASE_ERROR`). |
| `client/src/store/predictionStore.ts` | (Already present) `getAuthHeaders()`, `inFlightBets` double-submit guard, `placeBetErrorFromResponse()` for user-facing messages; 401 → signOut + “Session expired. Sign in again.” |

### Request/response contract: `POST /api/predictions/:id/place-bet`

**Headers**

- `Content-Type: application/json`
- `Authorization: Bearer <Supabase access_token>` (required)

**Body (demo mode)**

- `optionId` (required, UUID)
- `amountUSD` (required for demo/crypto, number > 0, in dollars)
- `fundingMode`: `"demo"` | `"crypto"` | `"fiat"`
- `requestId` (optional, for idempotency)
- `amountNgn` (required when `fundingMode === "fiat"`)

**Responses**

- **200/201:** `{ ok: true, entryId, data: { prediction, entry }, requestId?, version }`
- **400:** `{ code: "FCZ_BAD_REQUEST", message, requestId?, version }` — invalid body / option / amount
- **401:** `{ code: "FCZ_AUTH_REQUIRED", message: "Authorization required", requestId?, version }`
- **403:** `{ code: "FCZ_FORBIDDEN", message?, requestId?, version }` — e.g. betting disabled, RLS
- **404:** `{ code: "FCZ_NOT_FOUND" | "FCZ_INVALID_REFERENCE", message, requestId?, version }` — prediction/option not found
- **409:** `{ code: "FCZ_DUPLICATE_BET", message: "Bet already exists", requestId?, version }`
- **500:** `{ code: "FCZ_DATABASE_ERROR", error?, message, requestId, version }` — only for unexpected server/DB errors

### How to test (Phase 2)

1. **iOS simulator (demo mode)**
   - Log in.
   - Open a prediction (status open).
   - Choose option, enter stake amount (e.g. 10).
   - Tap “Lock stake”.
   - **Confirm:** Single `POST` to `/api/predictions/:id/place-bet` with `Authorization: Bearer <token>`; 200/201; UI updates without refresh.
2. **Expired session**
   - Sign out or clear session; try “Lock stake”.
   - **Confirm:** 401 with `FCZ_AUTH_REQUIRED`; client shows “Session expired. Sign in again.”; no retry.
3. **Invalid payload**
   - Try stake 0 or blank amount (if UI allows) or invalid option.
   - **Confirm:** Client blocks and/or server returns 400 with specific reason.
4. **Double-tap**
   - Tap “Lock stake” multiple times quickly.
   - **Confirm:** No duplicate bets; button disabled while request is in flight (and/or server returns 409 and client shows “You already placed a stake on this prediction.”).
5. **Web**
   - Same demo flow on web; confirm no regressions.

---

## Smoke test (scripted) — optional

- **Comments:** In browser devtools Network tab, filter by “comments”; post one comment; expect exactly one `POST` to `.../api/v2/social/predictions/.../comments` with auth header.
- **Place-bet:** In Network tab, filter by “place-bet”; tap Lock stake once; expect exactly one `POST` to `.../api/predictions/.../place-bet` with auth header and body `{ optionId, amountUSD, fundingMode: "demo", ... }`.
