# Fixing Google OAuth App Name Issue

## Problem
When users authenticate with Google, the consent screen shows an app name that doesn't include "FanClubZ", which can appear sketchy to users.

## Solution
The OAuth app name is configured in **Google Cloud Console**, not in your code. You need to update it there.

## Steps to Fix

### 1. Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one associated with your Supabase Google OAuth setup)

### 2. Navigate to OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Or directly: https://console.cloud.google.com/apis/credentials/consent

### 3. Update App Information
1. **App name**: Set to `FanClubZ` (or `FanClubZ - Social Predictions`)
2. **User support email**: Your support email
3. **App logo**: Upload your FanClubZ logo (optional but recommended)
4. **Application home page**: `https://app.fanclubz.app`
5. **Application privacy policy link**: Your privacy policy URL
6. **Application terms of service link**: Your terms of service URL

### 4. Configure Scopes (if needed)
- Ensure only necessary scopes are requested
- Common scopes: `email`, `profile`, `openid`

### 5. Save and Publish
1. Click **Save and Continue**
2. If your app is in "Testing" mode, you may need to:
   - Add test users, OR
   - Publish the app (requires verification if requesting sensitive scopes)

### 6. Verify in Supabase
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Google**
3. Ensure the OAuth client ID matches the one in Google Cloud Console

## Important Notes

- **App Name Display**: The app name you set in Google Cloud Console is what users will see in the consent screen
- **Verification**: If your app requests sensitive scopes or is used by many users, Google may require verification
- **Branding**: The app logo and name should match your brand for trust

## Testing
After updating:
1. Clear browser cache/cookies
2. Try signing in with Google again
3. Verify the consent screen shows "FanClubZ" as the app name

## Alternative: Supabase OAuth Configuration
If you're using Supabase's built-in Google OAuth:
- Supabase uses the OAuth client you configure in Google Cloud Console
- The app name comes from your Google Cloud Console settings
- Supabase doesn't override the app name - it uses what's configured in Google

## Need Help?
- [Google OAuth Consent Screen Documentation](https://support.google.com/cloud/answer/10311615)
- [Supabase Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)

