# OAuth Configuration Fix Guide for Fan Club Z

## Quick Fix Checklist

### 1. Supabase Dashboard Configuration

**Navigation**: Supabase Dashboard → Authentication → URL Configuration

**Redirect URLs to Add:**
```
http://localhost:5173/auth/callback
https://localhost:5173/auth/callback
```

**Site URL:**
```
http://localhost:5173
```

### 2. Google OAuth Configuration (if using Google login)

**Google Cloud Console Navigation**: Google Cloud Console → APIs & Services → Credentials

**Authorized JavaScript Origins:**
```
http://localhost:5173
https://localhost:5173
```

**Authorized Redirect URIs:**
```
https://ihtnsyhknvltgrksffun.supabase.co/auth/v1/callback
```

### 3. Environment Variables Check

Verify these are set in `.env.local`:
```
VITE_SUPABASE_URL=https://ihtnsyhknvltgrksffun.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_DEBUG=true
```

### 4. Testing the Fix

1. **Clear browser storage**: Open DevTools → Application → Storage → Clear storage
2. **Start OAuth flow**: Click "Continue with Google" 
3. **Check callback URL**: Should redirect to `http://localhost:5173/auth/callback`
4. **Check console logs**: Look for successful session establishment
5. **Use debug panel**: Press Ctrl+D on callback page to see debug info

## Common Issues & Solutions

### Issue: "No user session found after OAuth callback"

**Causes:**
- Callback URL mismatch between Supabase and your app
- PKCE flow not properly configured
- Browser blocking third-party cookies

**Solutions:**
1. Verify exact callback URL match in Supabase dashboard
2. Clear browser storage and cookies
3. Test in incognito mode
4. Check network tab for failed requests

### Issue: OAuth popup gets blocked

**Solution:**
- Ensure popup is triggered by user action (not programmatically)
- Test in different browsers
- Check popup blocker settings

### Issue: "Invalid redirect URI" from OAuth provider

**Solution:**
- Add your callback URL to OAuth provider settings
- For Google: Use the Supabase auth callback URL, not your app URL

## Debug Steps

### 1. Enable Debug Mode
Add this to your browser console on the callback page:
```javascript
localStorage.setItem('supabase.auth.debug', 'true');
```

### 2. Check Network Requests
In DevTools Network tab, look for:
- OAuth authorization request (should redirect to provider)
- Callback request with `code` parameter
- Token exchange request to Supabase
- Session establishment request

### 3. Inspect URL Parameters
On callback page, check URL for:
- `code` parameter (PKCE flow)
- `access_token` in hash (implicit flow) 
- `error` parameter (OAuth errors)

### 4. Verify Session Storage
In DevTools Application tab, check localStorage for:
- `supabase.auth.token` entries
- Session data persistence

## Advanced Troubleshooting

### Test OAuth Flow Manually

1. **Generate OAuth URL**:
```javascript
// In browser console
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'http://localhost:5173/auth/callback'
  }
});
console.log('OAuth URL:', data.url);
```

2. **Test Callback Processing**:
```javascript
// On callback page console
const urlParams = new URLSearchParams(window.location.search);
console.log('Code:', urlParams.get('code'));
console.log('Error:', urlParams.get('error'));
```

3. **Manual Session Check**:
```javascript
// Check current session
const { data: { session }, error } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Error:', error);
```

## Validation Commands

Run these in browser console to verify setup:

```javascript
// 1. Check Supabase client config
console.log('Supabase URL:', supabase.supabaseUrl);
console.log('Supabase Key:', supabase.supabaseKey ? 'Set' : 'Missing');

// 2. Check current URL structure
console.log('Current origin:', window.location.origin);
console.log('Expected callback:', `${window.location.origin}/auth/callback`);

// 3. Test auth methods availability
console.log('Auth methods:', Object.keys(supabase.auth));

// 4. Check for existing session
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Current session:', data.session ? 'Exists' : 'None');
  console.log('Session error:', error);
});
```

## Contact Support

If issues persist after following this guide:
1. Take screenshot of debug panel output
2. Copy browser console logs during OAuth flow
3. Note exact error messages and timing
4. Test in incognito mode to rule out extension conflicts

The debug panel (Ctrl+D on callback page) provides comprehensive diagnostic information for troubleshooting.