## OAuth Redirect Debugging Checklist

### The Issue
When signing in with Google on localhost:5174, the OAuth callback redirects to production (app.fanclubz.app) instead of localhost.

### Root Cause Analysis

The problem is likely ONE of these:

1. **Browser/Vite cache** - Old code is still running
2. **Supabase Site URL configuration** - Overriding our redirectTo parameter
3. **Environment variable not loaded** - VITE_APP_URL still pointing to production

### Systematic Fix Steps

#### STEP 1: Complete Cache Clear
```bash
# Stop dev server (Ctrl+C)
cd /Users/efe/Library/CloudStorage/OneDrive-Personal/Fan\ Club\ Z\ v2.0/FanClubZ-version2.0

# Clear Vite cache
rm -rf client/node_modules/.vite
rm -rf client/.vite

# In browser DevTools Console:
localStorage.clear()
sessionStorage.clear()
# Then: Application tab → Clear site data

# Restart dev server
cd client && npm run dev
```

#### STEP 2: Check Supabase Dashboard Configuration
Go to: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/auth/url-configuration

**Critical Setting: "Site URL"**
- If this is set to `https://app.fanclubz.app`, Supabase might be using it as the default redirect
- Change it to: `http://localhost:5174` for local development
- OR: Use Supabase's "Additional Redirect URLs" to add localhost

**Important:** Supabase has TWO redirect configurations:
1. **Site URL** - The default/fallback redirect URL
2. **Redirect URLs** - Allowed redirect URLs list

Both need to include your localhost URL.

#### STEP 3: Verify Console Logs
After clearing cache and restarting, when you click "Sign in with Google", you MUST see:

```
🔍 getRedirectUrl called - hostname: localhost
🔍 isLocalDev check: true
🔧 Auth redirect URL (local dev): http://localhost:5174/auth/callback
🔐 OAuth redirect URL: http://localhost:5174/auth/callback?next=...
```

If you DON'T see these logs = the new code isn't running (cache issue).
If you DO see these logs but still redirect to production = Supabase dashboard config issue.

#### STEP 4: Nuclear Option - Force localhost in code
If Steps 1-3 don't work, we can hardcode localhost temporarily:

Edit `client/src/lib/supabase.ts` line 173-180:
```typescript
signInWithOAuth: async (provider: OAuthProvider, options?: { next?: string }) => {
    // FORCE localhost for debugging
    const redirectUrl = 'http://localhost:5174/auth/callback';
    console.log('🔐 FORCED OAuth redirect URL:', redirectUrl);
    
    const { data, error} = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,  // Hardcoded for testing
```

### Next Actions

1. Run the clean restart script: `bash debug-scripts/clean-restart.sh`
2. Check Supabase dashboard Site URL
3. Test Google OAuth and check console for my debug logs
4. Report back which logs you see (or don't see)

This will tell us exactly where the problem is.
