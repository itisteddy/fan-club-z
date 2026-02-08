# Phase A Audit Note — Comments Pipeline (Prediction Details)

Date: 2026-02-07

## Client endpoints in use (verified)
- GET comments: `GET /api/v2/social/predictions/:predictionId/comments`
- POST comment: `POST /api/v2/social/predictions/:predictionId/comments` (body: `{ body, parentId?, clientRequestId? }`)
- Edit comment: `PATCH /api/v2/social/comments/:commentId` (body: `{ body }`)
- Delete comment: `DELETE /api/v2/social/comments/:commentId`
- Like/unlike comment: `POST /api/v2/social/comments/:commentId/like` / `DELETE /api/v2/social/comments/:commentId/like`
- Report comment: `POST /api/v2/moderation/reports`

Primary UI path on Prediction Details uses `client/src/features/comments/CommentsSection.tsx` + `client/src/store/unifiedCommentStore.ts`.
Legacy store `client/src/store/commentStore.ts` still exists and uses direct Supabase `comments` table, but it is not used by the Prediction Details page.

## Backend routes verified
- Social comment routes: `server/src/routes/social.ts`
- Moderation/reporting routes: `server/src/routes/moderation.ts`

## Root cause of “comment appears then disappears”
- The UI previously mixed sources in different views (legacy Supabase comment store vs REST comments), and failed optimistic requests were rolled back or replaced by a refetch from a different source, causing the “ghost” behavior.
- Fix applied in Phase 0: Prediction Details now uses a single canonical REST source (`/api/v2/social/...`) and preserves failed optimistic comments with retry instead of clearing them on error.

## Endpoint mismatch causing “endpoint not found” (edit)
- The client now calls `PATCH /api/v2/social/comments/:commentId`, which exists in `server/src/routes/social.ts`.

## Delete 400 issue
- Client now calls `DELETE /api/v2/social/comments/:commentId` with no body; server handles soft delete and returns structured JSON.
