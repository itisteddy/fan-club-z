# Phase 1 & 2: Comments Auth + Endpoint Routing; Lock Stake / Place Bet

## How to test (checklist for PR)

**Phase 1 — Comments (iOS simulator / Android / web)**  
- [ ] Log in → open prediction → post comment → **one** POST to `/api/v2/social/predictions/:id/comments` with `Authorization`; 200/201; comment appears without refresh.  
- [ ] Expired session → post comment → 401; UI shows "Session expired. Please log in again."; no second request to a different endpoint.  
- [ ] Web: same flows; no regressions.

**Phase 2 — Lock stake (iOS simulator / web)**  
- [ ] Log in → prediction → option + amount → "Lock stake" → **one** POST to `/api/predictions/:id/place-bet` with `Authorization`; 200/201; UI updates.  
- [ ] Expired session → "Lock stake" → 401 → "Session expired. Sign in again."; no retry.  
- [ ] Invalid payload (0 or blank amount) → client blocks or server 400 with reason.  
- [ ] Double-tap "Lock stake" → no duplicates; button disabled while pending (or 409 + "You already placed a stake...").  
- [ ] Web: demo bet still works.

---

## Files changed and why

### Phase 1 — Fix comment posting (401 + 404)

| File | Change |
|------|--------|
| `client/src/lib/apiClient.ts` | Doc block: canonical comments endpoints (`/api/v2/social/predictions/:id/comments` only; no `/api/v2/comments/...` fallback). `getAuthHeaders()` used for both fetch and CapacitorHttp. 401 → "Session expired. Please log in again."; 404 → log exact URL and "Server endpoint not found." Structured logging: `[apiClient] METHOD endpoint (with auth|no auth)`. |
| `client/src/store/unifiedCommentStore.ts` | **Single canonical endpoint:** create only `POST /api/v2/social/predictions/:predictionId/comments`; list/edit/delete use same route family. No fallback to `/api/v2/comments/predictions/...`. On 401: signOut + "Session expired. Please log in again." On 404: log URL, throw "Server endpoint not found." No retry by switching endpoints. |

### Phase 2 — Fix Lock Stake / Place Bet (auth + errors)

| File | Change |
|------|--------|
| `client/src/store/predictionStore.ts` | **Crypto branch:** now uses `getAuthHeaders()` and `placeBetErrorFromResponse()`; on 401/FCZ_AUTH_REQUIRED calls `signOut()` and shows "Session expired. Sign in again." Sends `fundingMode: 'crypto'` in body. Demo/fiat branches already had auth + error mapping. All place-bet paths: auth headers, inFlightBets double-submit guard, user-facing error messages. |
| `server/src/routes/predictions/placeBet.ts` | All error responses include `requestId` and `code` where applicable: 400 Zod → `FCZ_BAD_REQUEST`, 404 prediction/option → `FCZ_NOT_FOUND`/`FCZ_INVALID_REFERENCE`, 403 betting disabled → `FCZ_FORBIDDEN`, 500 DB failures → `FCZ_DATABASE_ERROR`. mapDbError already used for entry/lock failures; unmapped 500s return code + requestId. |

---

## Request/response contract: `POST /api/predictions/:id/place-bet`

### Headers (required for authenticated placement)

- `Content-Type: application/json`
- `Authorization: Bearer <Supabase access_token>` — required; server returns `401` with `code: "FCZ_AUTH_REQUIRED"` if missing/invalid.

### Body (demo mode)

- `optionId` (string, UUID) — required  
- `amountUSD` (number > 0) — required for demo/crypto  
- `userId` (optional; server uses JWT identity)  
- `fundingMode` (optional) — `"demo"` | `"crypto"` | `"fiat"`  
- `requestId` (optional) — idempotency key  

### Success

- `200` or `201`; body includes `data: { prediction, entry }`, optional `requestId`.

### Error responses (server)

- `401`: `{ code: "FCZ_AUTH_REQUIRED", message: "Authorization required", requestId }`  
- `400`: invalid body / invalid reference — `code` + `message` + `requestId` when using mapped DB errors  
- `403`: `FCZ_FORBIDDEN` or betting disabled  
- `409`: `{ code: "FCZ_DUPLICATE_BET", message: "Bet already exists", requestId }`  
- `500`: `{ error: "database_error", message: "...", requestId }` (only when not mapped to 4xx)

---

## How to test

### Phase 1 — Comments (iOS simulator / Android / web)

1. **Post comment (happy path)**  
   - Log in. Open a prediction. Open comments.  
   - Post a comment.  
   - **Confirm:** One `POST` request to `/api/v2/social/predictions/:id/comments`, with `Authorization` header.  
   - **Confirm:** Response 200/201 and comment appears in UI without refresh.

2. **401 → re-auth**  
   - Force expired session (e.g. sign out in another tab or clear session).  
   - Try to post a comment.  
   - **Confirm:** One request, 401; UI shows "Session expired. Please log in again." (or equivalent) and re-auth/sign-in is triggered; no second request to a different endpoint.

3. **Web**  
   - Same flows on web; confirm no regressions and comments still load/post using the same canonical endpoint.

### Phase 2 — Lock stake / Place bet (iOS simulator / web)

1. **Demo bet (happy path)**  
   - Log in. Open a prediction. Choose option, enter stake amount.  
   - Tap "Lock stake".  
   - **Confirm:** One `POST` to `/api/predictions/:id/place-bet` with `Authorization: Bearer <token>`.  
   - **Confirm:** 200/201 and UI updates without refresh.

2. **Expired session**  
   - Clear session / sign out.  
   - Try "Lock stake".  
   - **Confirm:** 401 with `FCZ_AUTH_REQUIRED`; client shows "Session expired. Sign in again." and does not retry.

3. **Invalid payload**  
   - Try stake 0 or blank amount.  
   - **Confirm:** Client blocks and/or server returns 400 with a clear reason.

4. **Double-tap**  
   - Tap "Lock stake" multiple times quickly.  
   - **Confirm:** No duplicate entries; button disabled while request is in flight (and/or server returns 409 and client shows "You already placed a stake on this prediction.").

5. **Web**  
   - Same demo flow on web; confirm no regressions.

---

## Helpers (apiClient.ts)

- **`getAuthHeaders()`** — Returns `{ Authorization: Bearer <token> }` from Supabase session (or localStorage fallback); used by both `fetch` and CapacitorHttp.  
- **`ApiError`** — Structured error with `message`, `status`, `url`, `responseData` for 401/404 and other non-2xx so callers can show user-facing messages.
