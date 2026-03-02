# Fix for OAuth Redirect and "Stay on Same Page" Issue

## Problem
1. CORS errors during OAuth callback
2. User not returning to the same page after sign-in

## Root Cause
The changes I made were too complex and broke the existing auth flow. The simpler approach is:
- Store return URL when opening auth gate ✅ (already working)
- Clear only the auth intent, keep return URL ✅ (now fixed)
- Use return URL in AuthCallback ✅ (already working)

## Supabase Configuration Required

### Step 1: Check Redirect URLs
Go to Supabase Dashboard → Authentication → URL Configuration

**Add these to "Redirect URLs":**

For Development:
```
http://localhost:5174/auth/callback
```

For Production:
```
https://app.fanclubz.app/auth/callback
```

### Step 2: Check Site URL
Make sure your **Site URL** is set to:
- Development: `http://localhost:5174`
- Production: `https://app.fanclubz.app`

### Step 3: Save and Test

After saving in Supabase:
1. Clear your browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Test the sign-in flow again

## How It Works Now

1. **User clicks "Sign In" on prediction page**
   - Current URL saved: `/prediction/60f74d59...`
   - Auth modal opens

2. **User signs in with Google**
   - Redirects to Google OAuth
   - Google redirects back to `/auth/callback`

3. **AuthCallback processes**
   - Reads saved URL: `/prediction/60f74d59...`
   - Redirects user to that URL
   - Clears the saved URL

4. **User lands back** on the prediction page

## Files Modified
- ✅ `authGateAdapter.ts` - Stores return URL, only clears auth intent
- ✅ `AuthCallback.tsx` - Uses return URL for redirect
- ✅ `AuthGateModal.tsx` - Reverted to working state
- ✅ `PredictionDetailsPageV2.tsx` - Uses `!!user` for auth check

## Testing Steps

1. Log out completely
2. Go to a prediction details page: `/prediction/{id}`
3. Check console - you should see: `🎯 Auth gate opened, storing return URL: /prediction/{id}`
4. Click "Sign In"
5. Complete Google OAuth
6. Check console - you should see: `🎯 AuthCallback - Stored return URL: /prediction/{id}`
7. You should be redirected back to the prediction page

## If It Still Doesn't Work

Check the browser console for these logs:
- `🎯 Auth gate opened, storing return URL: ...` 
- `🎯 AuthCallback - Stored return URL: ...`
- `🔄 Redirecting to return URL: ...`

If you see the logs but still end up on home page, the issue is likely:
1. Supabase redirect URLs not configured correctly
2. Browser cache issue (clear and try again)
3. Production vs Development URL mismatch

## CORS Errors

The CORS errors you're seeing are because Supabase isn't allowing requests from `http://localhost:5174`. This is fixed by adding the redirect URLs in Supabase dashboard as shown above.
