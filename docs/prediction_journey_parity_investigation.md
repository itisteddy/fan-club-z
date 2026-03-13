# Prediction Journey Parity Investigation

Date: 2026-03-12/13 (ET)  
Branch: `staging`  
Local HEAD: `f063d1fd` (before fix)

## Scope
- Created predictions tab (`/predictions?tab=Created`)
- Manage/Confirm Settlement modal flow
- `POST /api/v2/settlement/manual/merkle`
- Repeated "Prediction not found" toasts

## Phase 1 - Repro + evidence

### Observed failure
- In staging, user opens Created tab -> Manage -> Confirm Settlement.
- Frontend calls `POST /api/v2/settlement/manual/merkle`.
- Response is `404` with body:
  - `{"error":"Not found","message":"Prediction not found","version":"2.0.78"}`
- UI shows repeated "Prediction not found" toasts.

### HTTP evidence captured
- Staging backend health:
  - `GET https://fanclubz-backend-staging.onrender.com/health`
  - `200`, body includes:
    - `env: "staging"`
    - `gitSha: "f063d1fdf316e1f3a74cb475f0d87ab3f4647885"`
- Staging settlement endpoint:
  - `POST https://fanclubz-backend-staging.onrender.com/api/v2/settlement/manual/merkle`
  - `404`
  - body: `{"error":"Not found","message":"Prediction not found","version":"2.0.78"}`
  - sample headers included `x-request-id: e4f08fd7-4f66-46a9-871e-830ed2f69c36`
- Production settlement endpoint (same invalid payload check):
  - `POST https://fan-club-z.onrender.com/api/v2/settlement/manual/merkle`
  - `404`
  - same body shape: `Prediction not found`

### Key implication
- This is **not** a missing route/mount issue (endpoint exists in both staging and prod).
- The returned 404 is from prediction lookup inside handler (`predictionId` did not resolve).

## Phase 2 - Staging vs prod parity check

### Route support parity
- Backend code contains:
  - `router.post('/manual/merkle', ...)` in `server/src/routes/settlement.ts`
  - route mounted via `app.use('/api/v2/settlement', settlementRoutes)` in `server/src/index.ts`
- Live staging backend SHA (`f063d1fd...`) includes this route.
- Live prod also responds on same route contract.

### Mismatch category
- **Category D + B (combined):**
  - **D (data/context mismatch):** settlement request can be initiated from stale/non-canonical prediction context in Created flow.
  - **B (frontend request payload issue):** modal posts with `prediction.id` from local card context without enforcing canonical refreshed ID.

## Phase 3 - Codepath inventory

### Frontend
- `client/src/pages/PredictionsPage.tsx`
  - Created-tab cards set `selectedPrediction` and open Manage modal.
- `client/src/components/modals/ManagePredictionModal.tsx`
  - Opens `SettlementModal` and passes prediction object.
- `client/src/components/modals/SettlementModal.tsx`
  - Calls `useSettlementMerkle().settleWithMerkle(...)` with `predictionId: prediction.id`.
  - Loads prediction options via `fetchPredictionById`, but submit path used incoming id directly.
- `client/src/hooks/useSettlementMerkle.ts`
  - Sends `POST /api/v2/settlement/manual/merkle`.
  - Displays backend error message in toast.

### Backend
- `server/src/routes/settlement.ts`
  - `POST /manual/merkle` validates `predictionId/winningOptionId/userId`.
  - Returns `404 Prediction not found` when lookup on `predictions.id` fails.
- `server/src/index.ts`
  - Mounts settlement router at `/api/v2/settlement`.

## Phase 4 - Minimal root-cause fix implemented

### Fix summary
- File changed: `client/src/components/modals/SettlementModal.tsx`
- Changes:
  1. Added canonical prediction ID state and validity guards before settlement submit.
  2. Reused refreshed prediction result (`fetchPredictionById`) to set canonical ID.
  3. Added `predictionMissing` guard: disables Continue/Confirm when modal cannot refresh prediction context.
  4. Prevents posting `/manual/merkle` with invalid IDs (e.g. empty/`null`/`undefined`) and shows one actionable message.

### Why this is the smallest safe fix
- No backend route changes.
- No route architecture changes.
- No broad refactor.
- Directly blocks the bad payload path that produces the staging 404/toast spam.

## Phase 5 - Validation

### Build validation
- `npm --prefix client run build` -> **PASS**.

### Live endpoint parity re-check (post-fix codepath assumptions)
- Staging backend `/health` confirms SHA includes route.
- Staging/prod both expose `/api/v2/settlement/manual/merkle`.

### Remaining live E2E step required
- Authenticated staging Created->Manage->Confirm Settlement UI pass is required after deploy to verify:
  - no false `Prediction not found` toast spam,
  - no 404 from stale modal context,
  - normal settlement for valid prediction.

## Live Rerun After `afca9ff6` Frontend Deploy

### Frontend deployment evidence
- Staging frontend now serves:
  - `/assets/index-EVDrjrL5.js`
- This is newer than the pre-fix bundle (`index-DtGDCa76.js`), indicating deploy advance after push.

### Authenticated live staging verification (disposable creator)
- Disposable creator user created in staging and authenticated via Supabase password flow.
- Terms accepted (`POST /api/v2/users/me/accept-terms`).
- Disposable prediction created and verified visible via:
  - `GET /api/v2/predictions/created/:userId` (contains prediction id)
  - `GET /api/v2/predictions/:predictionId` (same id, status `closed`)

### Critical parity result (same authenticated user + same prediction)
- `POST /api/v2/settlement/manual`:
  - `200`
  - sample `x-request-id`: `4e934f92-86d2-410b-bf99-8823a13cda5e`
  - body includes `ok: true` / `alreadySettled: true`
- `POST /api/v2/settlement/manual/merkle`:
  - `404`
  - sample `x-request-id`: `3685aec0-d035-4d1d-8b47-dcb85230f10b`
  - body: `{"error":"Not found","message":"Prediction not found","version":"2.0.78"}`

### Interpretation
- This confirms the parity issue is still open after frontend guardrails:
  - valid prediction exists and is retrievable in staging,
  - `manual` route succeeds,
  - `manual/merkle` route returns false `Prediction not found` for same entity.
- The remaining blocker is backend-path-specific behavior in `manual/merkle` (not resolved by `afca9ff6` UI fix).

## Technical Debt Note (requested)

- `manual/merkle` naming likely reflects legacy crypto-era terminology.
- It should be reviewed later as technical debt (API naming/clarity pass).
- **No rename/remove/contract change was made in this bugfix pass.**
