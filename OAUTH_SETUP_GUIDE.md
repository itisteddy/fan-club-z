# OAuth Setup Guide for Fan Club Z

## Security Notice
⚠️ **IMPORTANT**: This guide uses placeholder values. Never commit real OAuth credentials to Git!

## Overview
This guide helps you set up Google and Apple OAuth authentication for Fan Club Z.

## Prerequisites
- Supabase project configured
- Google Cloud Console access
- Apple Developer Account (for Apple OAuth)

## Step 1: Environment Configuration

Create a `.env.local` file with your real credentials (this file should be gitignored):

```bash
# ============================================================================
# OAUTH CONFIGURATION - REPLACE WITH YOUR REAL VALUES
# ============================================================================

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple OAuth
VITE_APPLE_CLIENT_ID=your.apple.service.id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-apple-private-key\n-----END PRIVATE KEY-----"

# OAuth Redirect URLs
VITE_OAUTH_REDIRECT_URL=http://localhost:5173/auth/callback
VITE_OAUTH_REDIRECT_URL_PRODUCTION=https://app.fanclubz.app/auth/callback
```

## Step 2: Google OAuth Setup

### Google Cloud Console Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select your project
3. Navigate to "APIs & Services" → "Credentials"
4. Create OAuth 2.0 Client ID (if not exists)
5. Add Authorized Redirect URIs:
   ```
   https://your-project-ref.supabase.co/auth/v1/callback
   ```

### Supabase Configuration
1. Go to your Supabase Dashboard
2. Navigate to Authentication → Providers
3. Enable Google provider
4. Add your Google Client ID and Client Secret
5. Set Redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`

## Step 3: Apple OAuth Setup

### Apple Developer Console
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create App ID with "Sign In with Apple" enabled
3. Create Service ID for web authentication
4. Configure Return URLs: `https://your-project-ref.supabase.co/auth/v1/callback`

### Supabase Configuration
1. In Supabase Authentication → Providers
2. Enable Apple provider
3. Add your Service ID, Team ID, Key ID, and Private Key

## Step 4: Supabase URL Configuration

In your Supabase Dashboard → Authentication → Settings → URL Configuration:

**Site URL:**
```
https://app.fanclubz.app
```

**Redirect URLs:**
```
http://localhost:5173/auth/callback
https://app.fanclubz.app/auth/callback
https://fan-club-z-dev-teddys-projects-d67ab22a.vercel.app/auth/callback
```

## Step 5: Testing

1. **Development Testing:**
   - Start your dev server: `npm run dev`
   - Go to `/auth` page
   - Test Google/Apple login buttons

2. **Production Testing:**
   - Deploy your application
   - Test OAuth flow on production domain

## Troubleshooting

### Common Issues:
1. **"Provider not enabled"**: Check Supabase Authentication → Providers
2. **"Redirect URI mismatch"**: Verify URIs match exactly in Google/Apple consoles
3. **"Invalid client"**: Double-check Client IDs and secrets

### Error Messages:
- **"Unsupported provider"**: OAuth provider not enabled in Supabase
- **"Redirect URI mismatch"**: URIs don't match between provider and Supabase
- **"Invalid credentials"**: Check Client ID/Secret in environment variables

## Security Best Practices

1. **Never commit real credentials** to Git repositories
2. **Use environment variables** for all sensitive data
3. **Add .env.local to .gitignore** (should already be there)
4. **Use different credentials** for development and production
5. **Rotate credentials regularly** for production environments
6. **Use secure storage** for production secrets (Vercel environment variables)

## File Structure

```
project/
├── .env.local.secrets          # Real credentials (gitignored)
├── .env.local                  # Development environment (gitignored)
├── OAUTH_SETUP_GUIDE.md        # This secure guide
└── client/
    └── src/
        └── store/
            └── authStore.ts    # OAuth implementation
```

## Need Help?

If you encounter issues:
1. Check browser console for error messages
2. Verify all environment variables are set correctly
3. Confirm OAuth providers are enabled in Supabase
4. Ensure redirect URIs match exactly

## Production Deployment

For production deployment:
1. Set environment variables in Vercel dashboard
2. Use production redirect URLs
3. Ensure HTTPS is enabled
4. Test OAuth flow thoroughly

---

**Remember**: Keep your real credentials secure and never share them in code repositories!
