# OAuth Debug Instructions

## Current Issue
Google OAuth redirects to a blank screen after authentication.

## Debugging Steps

### 1. Check Browser Console
When you click "Continue with Google":
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Click the Google sign-in button
4. Look for these log messages:
   - "🔑 Starting google OAuth login..."
   - "🔗 OAuth redirect URL: [URL]"
   - Any error messages

### 2. Check Network Tab
In DevTools Network tab:
1. Filter by "supabase" or "google"
2. Look for OAuth-related requests
3. Check if any requests fail (red status)

### 3. Check URL Structure
After clicking Google sign-in, verify the redirect URL contains:
- `localhost:5173/auth/callback` (development)
- OR `fanclubz-version2-0.vercel.app/auth/callback` (production)

### 4. Common Issues & Solutions

#### Issue: Blank screen after Google auth
**Solution**: Check Supabase OAuth configuration
1. Go to Supabase Dashboard
2. Authentication > Providers > Google
3. Verify redirect URLs include:
   - `http://localhost:5173/auth/callback`
   - `https://fanclubz-version2-0.vercel.app/auth/callback`

#### Issue: "OAuth callback processing failed"
**Solution**: Check if user already exists in database

#### Issue: Console shows "Invalid redirect URL"
**Solution**: Update redirect URLs in both:
- Environment variables (.env.local)
- Supabase dashboard

### 5. Manual Test
You can test the auth callback manually by:
1. Going directly to `/auth/callback` in browser
2. Check if the callback page loads correctly

### 6. Quick Fix Commands

```bash
# 1. Restart development server
npm run dev

# 2. Clear browser cache and cookies for localhost:5173

# 3. Test OAuth in incognito mode
```

## Expected Behavior
1. Click "Continue with Google"
2. Redirect to Google OAuth
3. User logs in with Google
4. Redirect back to `/auth/callback`
5. Process auth tokens
6. Redirect to main app (/)

## If Still Blank Screen
1. Check if `/auth/callback` route exists in App.tsx ✅
2. Check if AuthCallbackPage component loads ✅
3. Check Supabase OAuth provider configuration
4. Verify Google Cloud Console OAuth settings
