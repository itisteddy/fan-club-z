# Phase 4A: Notifications Data Model + API

## ✅ Implementation Complete

### Files Created

1. **Migration**: `server/migrations/314_notifications_table.sql`
   - Creates `notifications` table with all required fields
   - Indexes for performance (user_id + created_at, user_id + read_at)
   - Unique index on `external_ref` for idempotency

2. **Service**: `server/src/services/notifications.ts`
   - `createNotification()` - Creates notification with idempotency via `external_ref`
   - `createNotifications()` - Batch creation helper
   - Handles duplicate detection gracefully

3. **Routes**: `server/src/routes/notifications.ts`
   - `GET /api/v2/notifications` - List notifications (paged, cursor-based)
   - `POST /api/v2/notifications/mark-read` - Mark specific notifications as read
   - `POST /api/v2/notifications/mark-all-read` - Mark all unread as read

4. **Integration**: Mounted in `server/src/index.ts`

## 📋 Database Migration

**To apply the migration:**

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/[your-project]/sql
2. Copy and execute: `server/migrations/314_notifications_table.sql`
3. Verify table creation: `SELECT * FROM notifications LIMIT 1;` (should return empty result)

## 🔌 API Endpoints

### GET /api/v2/notifications

**Query Parameters:**
- `limit` (optional, default: 20, max: 100) - Number of notifications to return
- `cursor` (optional) - ISO timestamp or ID for pagination

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "type": "win",
      "title": "You won",
      "body": "Your prediction was correct",
      "href": "/predictions/123",
      "metadata": {},
      "readAt": null,
      "createdAt": "2025-01-22T..."
    }
  ],
  "unreadCount": 5,
  "nextCursor": "2025-01-22T...",
  "version": "2.0.78"
}
```

**Authentication:** Required (Bearer token)

### POST /api/v2/notifications/mark-read

**Body:**
```json
{
  "ids": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "success": true,
  "marked": 2,
  "version": "2.0.78"
}
```

**Authentication:** Required (Bearer token)
**Validation:** Only marks notifications belonging to authenticated user

### POST /api/v2/notifications/mark-all-read

**Response:**
```json
{
  "success": true,
  "marked": 5,
  "version": "2.0.78"
}
```

**Authentication:** Required (Bearer token)

## 🧪 Manual Testing

### 1. Create Test Notification (via SQL)

```sql
INSERT INTO notifications (user_id, type, title, body, href, external_ref)
VALUES (
  'your-user-id-here',
  'win',
  'Test: You won',
  'This is a test notification',
  '/predictions/test-id',
  'notif:test:manual:1'
);
```

### 2. Test GET Endpoint

```bash
curl -X GET "https://fan-club-z.onrender.com/api/v2/notifications?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** Returns notification with `unreadCount: 1`

### 3. Test Mark Read

```bash
curl -X POST "https://fan-club-z.onrender.com/api/v2/notifications/mark-read" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": ["notification-id-here"]}'
```

**Expected:** `readAt` is now set, `unreadCount` decreases

### 4. Test Mark All Read

```bash
curl -X POST "https://fan-club-z.onrender.com/api/v2/notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:** All unread notifications marked as read

### 5. Test Idempotency

```sql
-- Try inserting same external_ref twice
INSERT INTO notifications (user_id, type, title, external_ref)
VALUES ('user-id', 'test', 'Test', 'notif:test:duplicate:1');

-- Second insert should fail with unique constraint
INSERT INTO notifications (user_id, type, title, external_ref)
VALUES ('user-id', 'test', 'Test', 'notif:test:duplicate:1');
```

**Expected:** Second insert fails (idempotency enforced at DB level)

## 🔒 Security

- All endpoints require authentication
- Users can only read/update their own notifications (enforced in route handlers)
- `external_ref` uniqueness prevents duplicate notifications
- No RLS policies needed (service role used for admin, auth checks in routes)

## 📝 Next Steps (Phase 4B)

- Create notification bell component
- Create notifications page UI
- Add polling/refresh for unread count
- Wire up navigation to `href` paths
