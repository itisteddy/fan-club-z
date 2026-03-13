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

