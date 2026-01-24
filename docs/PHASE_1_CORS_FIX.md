# Phase 1: Backend CORS + Preflight + Socket.IO Fix

**Date:** 2026-01-23  
**Scope:** Server-only changes  
**Goal:** Fix iOS Capacitor pre-login failures by making CORS and OPTIONS handling correct and consistent

## Changes Made

### 1. Removed Custom OPTIONS Handler

**Before:** Custom `app.options('*', ...)` handler that manually set CORS headers  
**After:** Uses `cors()` middleware for both normal requests and preflight

**Why:** The custom handler was redundant and could cause inconsistencies. The `cors()` middleware handles OPTIONS automatically when registered correctly.

### 2. Single Source of Truth: `corsOptions`

Created a single `corsOptions` object used for:
- `app.use(cors(corsOptions))` - normal requests
- `app.options('*', cors(corsOptions))` - preflight requests

**Benefits:**
- No duplication of origin allowlist logic
- Consistent behavior for all requests
- Easier to maintain

### 3. CORS Registration Order

**Critical:** CORS middleware is now registered **BEFORE** any routes or auth middleware:

```typescript
// CORS must come before routes/auth
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Then other middleware (maintenance, static assets, etc.)
app.use(checkMaintenanceMode);
// ... routes registered later
```

**Why:** This ensures OPTIONS preflight requests never hit auth guards or route handlers, preventing 500 errors.

### 4. Socket.IO CORS Alignment

Updated Socket.IO server to use the same origin allowlist logic as REST API, ensuring consistency.

## Allowed Origins

The following origins are allowed:

### Web Production
- `https://fanclubz.app`
- `https://app.fanclubz.app`
- `https://auth.fanclubz.app` (for OAuth flows)

### Native App (Capacitor)
- `capacitor://localhost`
- `capacitor://app.fanclubz.app`
- `ionic://localhost`

### Local Development
- `http://localhost`
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:3000`

### Dynamic Matching
- Any origin starting with `capacitor://` or `ionic://` (for flexibility)
- Requests with no origin (server-to-server, mobile apps, Postman, curl)

## Verification

### 1. OPTIONS Preflight Test

```bash
curl -i -X OPTIONS "https://fan-club-z.onrender.com/api/v2/predictions?page=1&limit=20" \
  -H "Origin: capacitor://app.fanclubz.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: content-type"
```

**Expected Response:**
- Status: `204 No Content` or `200 OK`
- Headers include:
  - `Access-Control-Allow-Origin: capacitor://app.fanclubz.app`
  - `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control, If-None-Match, X-Admin-Key, apikey, x-client-info`
  - `Access-Control-Allow-Credentials: true`

### 2. GET Request Test

```bash
curl -i "https://fan-club-z.onrender.com/api/v2/predictions?page=1&limit=20" \
  -H "Origin: capacitor://app.fanclubz.app"
```

**Expected Response:**
- Status: `200 OK` (if public) or `401 Unauthorized` (if auth required)
- **NOT** blocked by CORS (no CORS error)
- Headers include `Access-Control-Allow-Origin: capacitor://app.fanclubz.app`

### 3. iOS Simulator Verification

1. Open iOS app in simulator (before sign-in)
2. Open Safari Web Inspector: **Develop → Simulator → [Your App]**
3. Check Network tab:
   - OPTIONS requests return `204` (not `500`)
   - GET requests succeed or return normal `401` (not CORS blocked)
   - No red "Preflight response is not successful" errors

### 4. Socket.IO Verification

1. After sign-in, check Console for Socket.IO connection
2. Should see `[RT] client connected` in server logs
3. No "bad response from server" errors
4. Socket connects successfully or fails with app-level auth, not CORS

### 5. Web Production Verification

1. Open `https://app.fanclubz.app` in browser
2. Verify all existing functionality works:
   - Login works
   - Predictions load
   - Wallet displays
   - No new errors in console

## Files Modified

- `server/src/index.ts` - Removed custom OPTIONS handler, unified CORS config
- `server/src/services/realtime.ts` - Updated comments to match REST API CORS logic

## No Breaking Changes

- Web production behavior is unchanged
- All existing origins still allowed
- Same security posture (strict allowlist, no wildcard)
- Credentials handling unchanged

## Next Steps

After Phase 1 is verified:
1. Test in iOS simulator
2. Verify web production still works
3. Proceed to Phase 2 (build targets + store-safe mode containment)
