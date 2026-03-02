# Browser Console Commands to Clear All Caches

Copy and paste these commands into your browser console (F12 → Console tab) while on localhost:5174:

## Step 1: Clear Storage
```javascript
// Clear all storage
localStorage.clear();
sessionStorage.clear();
console.log('✅ Storage cleared');

// Clear IndexedDB
indexedDB.databases().then(dbs => {
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
  console.log('✅ IndexedDB cleared');
});

// Unregister service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
  console.log('✅ Service workers unregistered');
});
```

## Step 2: Verify Environment Variables
```javascript
// Check what environment variables are loaded
console.log('═══════════════════════════════════════');
console.log('Environment Check:');
console.log('VITE_APP_URL:', import.meta.env.VITE_APP_URL);
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('MODE:', import.meta.env.MODE);
console.log('DEV:', import.meta.env.DEV);
console.log('PROD:', import.meta.env.PROD);
console.log('hostname:', window.location.hostname);
console.log('═══════════════════════════════════════');
```

## What You Should See

**After clearing:** The diagnostic component should automatically log on page load:
```
═══════════════════════════════════════
🔍 OAUTH REDIRECT DIAGNOSTIC
═══════════════════════════════════════
Environment Variables:
  VITE_APP_URL: http://localhost:5174  ← MUST be localhost
  VITE_API_URL: http://localhost:3000
  MODE: development
  DEV: true  ← MUST be true
  PROD: false  ← MUST be false
...
```

**If you see:**
- `VITE_APP_URL: https://app.fanclubz.app` → Environment not loaded, cache issue
- `DEV: false` or `PROD: true` → Build mode issue, cache issue
- No diagnostic logs at all → Code not running, severe cache issue

## Then Test OAuth

After clearing everything and seeing correct logs, try Google sign in. You should see:
```
═══════════════════════════════════════
🔐 OAUTH SIGN IN STARTED
  Provider: google
  Current hostname: localhost
═══════════════════════════════════════
🔍 getRedirectUrl called - hostname: localhost
🔍 isLocalDev check: true  ← CRITICAL
🔧 Auth redirect URL (local dev): http://localhost:5174/auth/callback
```

If `isLocalDev check: false` → Something is wrong with hostname detection
If still redirects to production → Supabase dashboard Site URL override
