# 🔧 COMPLETE OAuth Redirect Fix - Step by Step Guide

## The Problem
When logging in with Google on `localhost:5174`, you're being redirected to `https://app.fanclubz.app/auth/callback` instead of `http://localhost:5174/auth/callback`.

## The Solution
I've fixed the code to properly detect localhost and use the correct redirect URL. However, **Vite is aggressively caching the old code**, so you need to force a complete rebuild.

---

## 🚀 STEP 1: Nuclear Cache Clear (Required!)

Run this command from the project root:

```bash
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"
bash nuclear-cache-clear.sh
```

This script will:
- Kill all Node processes
- Delete all Vite cache directories
- Clear npm cache
- Reinstall dependencies
- Give you next steps

**This will take 1-2 minutes but is absolutely necessary.**

---

## 🚀 STEP 2: Start Dev Server

```bash
cd client
npm run dev
```

Wait for the server to fully start. You should see:
```
VITE v... ready in ...ms
➜  Local:   http://localhost:5174/
```

---

## 🚀 STEP 3: Test Environment Loading BEFORE Opening App

**Before** opening the main app, test if environment variables are loading correctly:

Open in browser: **`http://localhost:5174/oauth-debug.html`**

You should see a green terminal-style page. If ALL checks pass (✅), proceed to Step 4.

### Expected Output:
- ✅ Running on localhost
- ✅ DEV mode is enabled
- ✅ PROD mode is disabled
- ✅ VITE_APP_URL points to localhost

### If you see errors (❌):
1. Stop the dev server
2. Run `nuclear-cache-clear.sh` again
3. Hard refresh your browser (Ctrl+Shift+R)
4. Check the test page again

---

## 🚀 STEP 4: Clear Browser Storage

In your browser (with DevTools open - press F12):

1. **Console tab** → Type and press Enter:
   ```javascript
   localStorage.clear(); sessionStorage.clear();
   ```

2. **Application tab** → Click "Clear site data" button

3. **Hard refresh** the page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

## 🚀 STEP 5: Open Main App and Verify Diagnostic Logs

Open: **`http://localhost:5174`**

**IMMEDIATELY check the console.** You MUST see this on page load:

```
═══════════════════════════════════════
🔍 OAUTH REDIRECT DIAGNOSTIC
═══════════════════════════════════════
Environment Variables:
  VITE_APP_URL: http://localhost:5174  ← Must be localhost!
  VITE_API_URL: http://localhost:3000
  MODE: development
  DEV: true  ← Must be true!
  PROD: false  ← Must be false!

Current Location:
  hostname: localhost
  origin: http://localhost:5174

Expected OAuth Redirect:
  ✅ Should redirect to: http://localhost:5174/auth/callback
═══════════════════════════════════════
```

### ⚠️ If you DON'T see these logs:
- The cache is still there
- Go back to Step 1 and run the nuclear cache clear again
- Make absolutely sure you're hard refreshing (Ctrl+Shift+R)

---

## 🚀 STEP 6: Test Google OAuth

Click "Sign in with Google" button.

You should see these logs **BEFORE** being redirected to Google:

```
═══════════════════════════════════════
🔐 OAUTH SIGN IN STARTED
  Provider: google
  Next param: /
  Current hostname: localhost
  Current origin: http://localhost:5174
═══════════════════════════════════════
🔍 getRedirectUrl called - hostname: localhost
🔍 isLocalDev check: true  ← CRITICAL! Must be true!
🔧 Auth redirect URL (local dev): http://localhost:5174/auth/callback
🔐 Final OAuth redirect URL: http://localhost:5174/auth/callback
═══════════════════════════════════════
```

### ✅ Success Indicators:
- `isLocalDev check: true`
- Redirect URL is `http://localhost:5174/auth/callback`
- After Google login, you return to `localhost:5174`, NOT `app.fanclubz.app`

### ❌ If it still redirects to production:

The logs show the correct localhost URL BUT you still end up on production, then the issue is **Supabase Dashboard Configuration**, not the code.

Go to: https://supabase.com/dashboard/project/ihtnsyhknvltgrksffun/auth/url-configuration

Check the **"Site URL"** setting:
- If it's `https://app.fanclubz.app`, that's overriding our redirect
- Temporarily change it to `http://localhost:5174` for local development
- OR ensure `http://localhost:5174` is in the "Redirect URLs" list

---

## 📋 Troubleshooting Decision Tree

**Q: I don't see the diagnostic logs at all**
→ A: Cache issue. Run nuclear cache clear, hard refresh browser.

**Q: Diagnostic logs show wrong values (PROD: true, or production URLs)**
→ A: Cache issue or .env.local not loaded. Check `oauth-debug.html` test page.

**Q: Diagnostic logs show correct values BUT still redirects to production**
→ A: Supabase dashboard Site URL is overriding. Check Supabase config.

**Q: I see "isLocalDev check: false" even though I'm on localhost**
→ A: Hostname detection failed. Check console for actual hostname value.

---

## 📁 Files I Created/Modified

### Modified:
1. `client/src/lib/supabase.ts` - Fixed redirect URL logic
2. `client/src/App.tsx` - Added diagnostic component
3. `client/.env.local` - Added localhost URL overrides

### Created:
1. `nuclear-cache-clear.sh` - Complete cache clearing script
2. `client/oauth-debug.html` - Environment test page
3. `BROWSER-CONSOLE-COMMANDS.md` - Browser debugging commands
4. `client/src/components/diagnostics/OAuthDiagnostic.tsx` - Diagnostic component

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Nuclear cache clear
cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0"
bash nuclear-cache-clear.sh

# 2. Start dev server
cd client && npm run dev

# 3. Test environment
# Open: http://localhost:5174/oauth-debug.html
# Should see all ✅ green checks

# 4. Clear browser
# F12 → Console → localStorage.clear(); sessionStorage.clear();
# F12 → Application → Clear site data
# Ctrl+Shift+R to hard refresh

# 5. Open app and check console
# Open: http://localhost:5174
# Must see diagnostic logs immediately

# 6. Test OAuth
# Should redirect back to localhost
```

---

## ✅ Success Checklist

- [ ] Ran nuclear-cache-clear.sh
- [ ] Restarted dev server
- [ ] Test page (oauth-debug.html) shows all green ✅
- [ ] Cleared browser storage
- [ ] Hard refreshed browser
- [ ] See diagnostic logs on app load
- [ ] Diagnostic shows `DEV: true` and `PROD: false`
- [ ] Diagnostic shows `isLocalDev: true`
- [ ] OAuth logs show localhost redirect URL
- [ ] After Google login, returns to localhost (not production)

---

**If ALL steps above are completed and it STILL doesn't work, the issue is 100% in your Supabase dashboard "Site URL" configuration.**
