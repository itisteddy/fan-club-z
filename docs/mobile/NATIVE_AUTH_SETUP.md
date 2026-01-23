# Native OAuth Deep Link Setup

## Required: Supabase Configuration

For native iOS/Android OAuth to work, you **must** add the deep link scheme to Supabase's allowed redirect URLs.

### Steps:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication → URL Configuration**
4. Under **"Redirect URLs"** or **"Additional Redirect URLs"**, add:
   ```
   fanclubz://auth/callback
   ```
5. Save the configuration

### Why This Is Required

- Native builds use `fanclubz://auth/callback` as the redirect URL (not HTTPS)
- Supabase validates redirect URLs against an allowlist
- Without this entry, OAuth will fail with "redirect_uri_mismatch" error

### Current Redirect URLs

- **Web**: `https://app.fanclubz.app/auth/callback`
- **Native iOS/Android**: `fanclubz://auth/callback` ← **Must be added to Supabase**

## How It Works

1. User taps "Continue with Google" in native app
2. App opens system browser with OAuth URL containing `redirect_to=fanclubz://auth/callback`
3. User completes OAuth in browser
4. Browser redirects to `fanclubz://auth/callback?code=...&state=...`
5. iOS/Android opens the app via deep link
6. App's `appUrlOpen` listener:
   - Closes the browser sheet
   - Exchanges code for session via `supabase.auth.exchangeCodeForSession()`
   - Navigates user to `/auth/callback` route
   - AuthCallback component completes the flow

## Troubleshooting

**Issue**: Browser doesn't close after OAuth
- Check that `fanclubz://auth/callback` is in Supabase redirect URLs
- Verify iOS Info.plist has `CFBundleURLSchemes = ["fanclubz"]`
- Check console logs for `appUrlOpen` events

**Issue**: "redirect_uri_mismatch" error
- Ensure `fanclubz://auth/callback` is added to Supabase dashboard
- Verify the exact scheme matches (no typos)
