# Apple Review Fix 6.2: UGC Safety Compliance

## UGC types covered
- Comments
- Prediction titles/descriptions
- User profile text fields (server-side guard path)

## Safeguards in place
- Server-side filtering via `assertContentAllowed` (rejects disallowed content).
- Reporting endpoints:
  - `POST /api/v2/moderation/reports`
  - `POST /api/v2/content/report`
  - `POST /api/v2/comments/:commentId/report`
- Blocking endpoints:
  - `GET /api/v2/users/me/blocked`
  - `POST /api/v2/users/:id/block`
  - `DELETE /api/v2/users/:id/block`
- Feed/query enforcement excludes blocked users in predictions/social routes.
- Admin moderation queue and actions:
  - `GET /api/v2/admin/moderation/reports`
  - `POST /api/v2/admin/moderation/reports/:reportId/resolve`
  - content remove / user suspension actions logged to moderation actions.

## Data model involved
- `content_reports`
- `user_blocks`
- `moderation_actions`

## Operational requirement
- Reports must be triaged in admin queue within 24 hours.

## Validation checklist
1. Report a comment from user A -> report row created and visible in admin queue.
2. Block user B from user A -> B’s content disappears immediately from A’s active lists.
3. Refresh session -> blocked filtering persists.
4. Admin removes reported content -> content hidden/removed and action logged.
5. Admin suspends reported user -> user cannot continue posting.
