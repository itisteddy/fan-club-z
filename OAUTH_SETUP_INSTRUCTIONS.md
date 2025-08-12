# OAuth Setup Instructions for Fan Club Z

## Overview
This guide will help you set up Google and Apple OAuth authentication for Fan Club Z, reducing the need for manual email/password storage and improving user experience.

## Prerequisites
- Supabase project set up
- Google Cloud Console access
- Apple Developer Account (for Apple OAuth)

## 1. Install Required Dependencies

Run these commands in your project root:

```bash
# Install OAuth dependencies
npm install @supabase/auth-ui-react @supabase/auth-ui-shared

# Install additional utilities
npm install jsonwebtoken jose
```

## 2. Environment Variables Setup

Add these variables to your `.env.local` file:

```bash
# ============================================================================
# OAUTH CONFIGURATION
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
VITE_OAUTH_REDIRECT_URL_PRODUCTION=https://yourdomain.com/auth/callback
```

## 3. Google OAuth Setup

### Step 1: Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. In the sidebar, go to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client IDs"

### Step 2: Configure OAuth Consent Screen
1. Go to "OAuth consent screen" in the sidebar
2. Choose "External" user type
3. Fill in required information:
   - App name: "Fan Club Z"
   - User support email: your email
   - Developer contact: your email
4. Add scopes: `email`, `profile`, `openid`
5. Add test users if needed

### Step 3: Create OAuth 2.0 Client ID
1. Go back to "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   ```
   http://localhost:5173/auth/callback
   https://yourdomain.com/auth/callback
   https://your-project-id.supabase.co/auth/v1/callback
   ```
5. Copy the Client ID and Client Secret

## 4. Apple OAuth Setup

### Step 1: Apple Developer Console
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Sign in with your Apple Developer account

### Step 2: Create App ID
1. Go to "Certificates, Identifiers & Profiles"
2. Click "Identifiers" → "+"
3. Select "App IDs" → "App"
4. Fill in:
   - Description: "Fan Club Z App"
   - Bundle ID: `com.fanclubz.app` (or your chosen ID)
5. Enable "Sign In with Apple"
6. Save

### Step 3: Create Service ID
1. Go to "Identifiers" → "+"
2. Select "Services IDs"
3. Fill in:
   - Description: "Fan Club Z Web Service"
   - Identifier: `com.fanclubz.service`
4. Enable "Sign In with Apple"
5. Configure:
   - Primary App ID: Select the App ID created above
   - Web Domain: `yourdomain.com`
   - Return URLs: `https://your-project-id.supabase.co/auth/v1/callback`

### Step 4: Create Private Key
1. Go to "Keys" → "+"
2. Key Name: "Fan Club Z Sign In Key"
3. Enable "Sign In with Apple"
4. Choose your App ID
5. Download the .p8 key file
6. Note the Key ID (10-character string)

### Step 5: Get Team ID
1. In Apple Developer Console, your Team ID is shown in the top right
2. It's a 10-character alphanumeric string

## 5. Supabase Configuration

### Step 1: Configure Google Provider
1. Go to your Supabase dashboard
2. Navigate to Authentication → Providers
3. Find "Google" and toggle it on
4. Enter your Google Client ID and Client Secret
5. Set Redirect URL: `https://your-project-id.supabase.co/auth/v1/callback`

### Step 2: Configure Apple Provider
1. In the same Providers section, find "Apple"
2. Toggle it on
3. Enter:
   - Client ID: Your Service ID (e.g., `com.fanclubz.service`)
   - Team ID: Your Apple Team ID
   - Key ID: Your Apple Key ID
   - Private Key: Contents of your .p8 file
4. Set Redirect URL: `https://your-project-id.supabase.co/auth/v1/callback`

### Step 3: Update Site URL
1. In Authentication → Settings
2. Set Site URL to your production domain
3. Add additional redirect URLs if needed

## 6. Test OAuth Integration

### Development Testing
1. Start your development server: `npm run dev`
2. Go to `/auth` page
3. Click "Continue with Google" or "Continue with Apple"
4. Complete the OAuth flow
5. Verify user is created in Supabase Auth → Users

### Production Testing
1. Deploy your application
2. Update OAuth provider redirect URLs to use production domain
3. Test the complete flow

## 7. Troubleshooting

### Common Google OAuth Issues
- **Invalid redirect URI**: Ensure all redirect URIs are exactly matching in Google Console
- **Access blocked**: Check OAuth consent screen configuration
- **Invalid client**: Verify Client ID in environment variables

### Common Apple OAuth Issues
- **Invalid client**: Check Service ID configuration
- **Key verification failed**: Ensure private key format is correct
- **Domain verification**: Verify domain ownership in Apple Console

### Common Supabase Issues
- **Provider not enabled**: Ensure providers are toggled on in dashboard
- **Incorrect credentials**: Double-check all Client IDs, secrets, and keys
- **Site URL mismatch**: Ensure Site URL matches your application domain

## 8. Security Best Practices

1. **Environment Variables**: Never commit OAuth credentials to version control
2. **HTTPS**: Always use HTTPS in production
3. **Redirect URIs**: Be specific with redirect URIs, avoid wildcards
4. **Key Rotation**: Regularly rotate OAuth secrets and keys
5. **Scope Limitation**: Only request necessary scopes
6. **Session Management**: Implement proper session timeout and refresh

## 9. Implementation Files Created

After following this setup, you'll have:
- Enhanced auth store with OAuth methods
- OAuth callback page for handling redirects
- Updated auth page with social login buttons
- Proper error handling and user feedback

## 10. Next Steps

After completing OAuth setup:
1. Test thoroughly in development
2. Update any additional redirect URLs
3. Consider implementing additional providers (GitHub, Facebook, etc.)
4. Add analytics to track OAuth usage
5. Implement proper user onboarding flow for OAuth users

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Check browser console for client-side errors
3. Verify all environment variables are set correctly
4. Ensure OAuth providers are properly configured
