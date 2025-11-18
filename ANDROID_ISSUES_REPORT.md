# Android APK Issues Report
**Date:** November 17, 2025  
**Status:** ⚠️ Partially Resolved / Workarounds Implemented

---

## Executive Summary

The Android APK build has **two critical unresolved issues** that impact user experience:

1. **OAuth Double Login Issue** - Users must sign in twice before authentication succeeds
2. **Wallet Connection Stuck** - Wallet connection gets stuck after signing in

Both issues are related to the OAuth flow and deep linking configuration between Google OAuth, Supabase, and Capacitor.

---

## Issue #1: OAuth Double Login Problem

### **Symptoms:**
- User clicks "Sign in with Google" on Android APK
- First login attempt **fails silently** or shows error
- Second login attempt **succeeds**
- User must authenticate twice to access the app

### **Root Cause Analysis:**

#### **Current Implementation:**
1. **OAuth Flow:**
   - Uses **Web OAuth Client ID** (`347030494027-re4ahucc65a6dodvsllf6dotukq5vvje`)
   - Redirect URL: `https://app.fanclubz.app/auth/callback`
   - Uses HTTPS deep linking (not custom URI scheme)

2. **Android Configuration:**
   ```xml
   <!-- AndroidManifest.xml -->
   <intent-filter android:autoVerify="true">
       <data
           android:scheme="https"
           android:host="app.fanclubz.app"
           android:pathPrefix="/auth/callback" />
   </intent-filter>
   ```

3. **Capacitor Configuration:**
   ```typescript
   // capacitor.config.ts
   server: {
     androidScheme: 'https',
     hostname: 'app.fanclubz.app',
   }
   ```

4. **OAuth Handler:**
   ```typescript
   // supabase.ts
   signInWithOAuth: async (provider, options) => {
     const native = isNativePlatform();
     if (native) {
       ensureNativeAuthListener(); // Listens for appUrlOpen events
     }
     
     await supabase.auth.signInWithOAuth({
       provider,
       options: {
         redirectTo: 'https://app.fanclubz.app/auth/callback',
         skipBrowserRedirect: native, // Opens Browser plugin
       }
     });
   }
   ```

#### **The Problem:**
1. **Browser Plugin Opens:** OAuth opens in Capacitor's `Browser` plugin (in-app browser)
2. **Redirect Handling:** After Google auth, redirects to `https://app.fanclubz.app/auth/callback`
3. **Deep Link Capture:** `appUrlOpen` listener should capture the redirect
4. **Session Exchange:** Supabase should exchange the auth code for a session
5. **Failure Point:** The session exchange or state update is not completing on first attempt

#### **Why It Fails:**
- **Timing Issue:** The `appUrlOpen` event may fire before the session is fully established
- **State Synchronization:** Auth state listener may not be ready when the callback arrives
- **PKCE Flow:** The code verifier may not be properly stored/retrieved in native context
- **Browser Close:** The browser closes before the session exchange completes

### **Attempted Fixes:**
1. ✅ **Added `ensureNativeAuthListener`** - Listens for `appUrlOpen` events
2. ✅ **Fixed auth state listener** - Now handles `SIGNED_IN` events properly (fixed for web)
3. ✅ **Added HTTPS deep linking** - AndroidManifest configured for HTTPS redirects
4. ✅ **Consolidated OAuth clients** - Using Web client for both web and native
5. ❌ **Still failing on first attempt** - Issue persists on Android

### **Current Workaround:**
- Users must sign in twice
- First attempt fails, second succeeds
- Not ideal UX but functional

---

## Issue #2: Wallet Connection Stuck

### **Symptoms:**
- User successfully signs in (after double login)
- Navigates to Wallet page
- Attempts to connect wallet (WalletConnect or injected)
- Connection process **gets stuck** or **hangs indefinitely**
- No error message shown to user

### **Root Cause Analysis:**

#### **Current Implementation:**
1. **WalletConnect Configuration:**
   ```typescript
   // wagmi.ts
   walletConnect({
     projectId: VITE_WALLETCONNECT_PROJECT_ID,
     metadata: {
       name: 'Fan Club Z',
       description: 'Social prediction platform',
       url: 'https://app.fanclubz.app',
       icons: ['https://app.fanclubz.app/icons/icon-512.png']
     }
   })
   ```

2. **Mobile Auto-Connect:**
   ```typescript
   // ConnectWalletSheet.tsx
   useEffect(() => {
     if (isMobile && wcConnector && open) {
       // Auto-connect WalletConnect on mobile
       handleConnect(wcConnector);
     }
   }, [isMobile, wcConnector, open]);
   ```

3. **Origin Allow-Listing:**
   - WalletConnect requires domain allow-listing at `cloud.reown.com`
   - Current domain: `app.fanclubz.app`
   - May not be properly configured for Android deep links

#### **The Problem:**
1. **Origin Mismatch:** Android APK may be using a different origin than expected
2. **Deep Link Context:** WalletConnect may not recognize the native app context
3. **Network Issues:** Connection may be blocked or timing out
4. **Session State:** Wallet connection may require a fully authenticated session first

### **Potential Causes:**
- **WalletConnect Project ID:** May not be configured for Android origins
- **Domain Allow-Listing:** `app.fanclubz.app` may not be whitelisted for native apps
- **Capacitor WebView:** The WebView context may not match expected origins
- **Network Permissions:** Android may be blocking WalletConnect network requests

### **Attempted Fixes:**
- ✅ **Auto-connect on mobile** - Attempts to connect WalletConnect automatically
- ✅ **Error handling** - Added 403 error detection for domain issues
- ❌ **Still stuck** - Connection hangs without resolution

---

## Technical Details

### **OAuth Client Configuration:**

**Current Setup:**
- **Web Client ID:** `347030494027-re4ahucc65a6dodvsllf6dotukq5vvje`
- **Android Client ID:** `347030494027-onlrov5htjv0eeuouf644a00e72cosnp` (exists but not used)
- **Desktop Client ID:** `347030494027-p2alretolfgs6i6lkiem2u2fopviicfo` (exists but not used)

**Why Web Client:**
- Web clients support HTTPS redirects
- Can be configured with Android package name and SHA-1 fingerprint
- Single client for web, PWA, and native (simpler management)

### **Deep Linking Strategy:**

**Current Approach:**
- Uses **HTTPS deep links** (`https://app.fanclubz.app/auth/callback`)
- AndroidManifest configured with `android:autoVerify="true"`
- Capacitor configured with `androidScheme: 'https'`

**Alternative (Not Implemented):**
- Custom URI scheme (`fanclubz://auth/callback`)
- Would require Android OAuth client (not Web client)
- More complex configuration

### **Code Flow:**

```
1. User clicks "Sign in with Google"
   ↓
2. signInWithOAuth() called
   ↓
3. isNativePlatform() = true
   ↓
4. ensureNativeAuthListener() sets up appUrlOpen listener
   ↓
5. Browser.open() opens Google OAuth in in-app browser
   ↓
6. User authenticates with Google
   ↓
7. Google redirects to: https://app.fanclubz.app/auth/callback?code=...
   ↓
8. appUrlOpen event fires with the callback URL
   ↓
9. Browser.close() called
   ↓
10. AuthCallback component should process the code
   ↓
11. Session exchange should happen
   ↓
12. ❌ FIRST ATTEMPT: Session exchange fails or state not updated
   ↓
13. ✅ SECOND ATTEMPT: Works (session already exists or retry succeeds)
```

---

## Known Limitations

### **1. OAuth Client Type Mismatch:**
- Using **Web OAuth client** for native app
- Google recommends **Android OAuth client** for native apps
- Web clients have restrictions on custom URI schemes

### **2. Deep Link Verification:**
- Android App Links require domain verification
- `android:autoVerify="true"` requires proper `.well-known/assetlinks.json`
- May not be properly configured on `app.fanclubz.app`

### **3. Session Persistence:**
- PKCE flow requires code verifier storage
- Native apps may have issues with sessionStorage/localStorage
- Code verifier may be lost between browser close and app resume

### **4. Browser Plugin Behavior:**
- Capacitor Browser plugin may close before session exchange
- Timing issues between browser close and app state update
- No guarantee of session persistence across browser close

---

## Recommended Solutions (Not Yet Implemented)

### **Solution 1: Use Android OAuth Client (Recommended)**

**Steps:**
1. Configure Android OAuth client in Google Cloud Console
2. Add package name: `com.fanclubz.app`
3. Add SHA-1 fingerprint from keystore
4. Use custom URI scheme: `com.googleusercontent.apps.<ANDROID_CLIENT_ID>:/oauth2redirect`
5. Update Supabase to use Android client ID
6. Update AndroidManifest with custom scheme intent filter

**Pros:**
- Native-first approach
- Better deep linking support
- No HTTPS redirect complexity

**Cons:**
- Requires separate OAuth client
- More complex configuration
- Need to manage multiple client IDs

### **Solution 2: Improve Session Exchange Timing**

**Steps:**
1. Add retry logic for session exchange
2. Increase delay before browser close
3. Poll for session after browser close
4. Add explicit session refresh after callback

**Pros:**
- Minimal code changes
- Works with current setup

**Cons:**
- May not fix root cause
- Adds complexity

### **Solution 3: Use Supabase Native SDK**

**Steps:**
1. Use `@supabase/supabase-js` with native adapters
2. Implement custom OAuth handler for Capacitor
3. Use Capacitor's OAuth plugin instead of Browser

**Pros:**
- Better native integration
- Handles OAuth flow automatically

**Cons:**
- Requires major refactoring
- May have compatibility issues

### **Solution 4: WalletConnect Origin Configuration**

**Steps:**
1. Verify WalletConnect project ID configuration
2. Add Android app origin to allow-list
3. Configure deep link origins in WalletConnect dashboard
4. Test with proper origin headers

**Pros:**
- Fixes wallet connection issue
- Proper domain configuration

**Cons:**
- Requires WalletConnect dashboard access
- May need additional configuration

---

## Current Workarounds

### **For Users:**
1. **OAuth:** Sign in twice if first attempt fails
2. **Wallet:** Try disconnecting and reconnecting wallet
3. **Alternative:** Use web app instead of APK for critical operations

### **For Development:**
1. **Testing:** Test OAuth flow thoroughly before releases
2. **Monitoring:** Add logging for OAuth callback events
3. **Error Handling:** Show clear error messages when auth fails

---

## Files Involved

### **OAuth Configuration:**
- `client/src/lib/supabase.ts` - OAuth handler and redirect URL logic
- `client/android/app/src/main/AndroidManifest.xml` - Deep link intent filters
- `client/capacitor.config.ts` - Capacitor server configuration
- `client/src/pages/auth/AuthCallback.tsx` - OAuth callback handler
- `client/src/store/authStore.ts` - Auth state management

### **Wallet Connection:**
- `client/src/lib/wagmi.ts` - Wagmi/WalletConnect configuration
- `client/src/components/wallet/ConnectWalletSheet.tsx` - Wallet connection UI
- `client/src/hooks/useAutoNetworkSwitch.ts` - Network switching logic

---

## Testing Status

### **Tested Scenarios:**
- ✅ Web OAuth flow (works correctly)
- ✅ PWA OAuth flow (works correctly)
- ⚠️ Android APK OAuth flow (fails first attempt)
- ⚠️ Android wallet connection (gets stuck)

### **Not Tested:**
- iOS OAuth flow
- iOS wallet connection
- Multiple OAuth client configuration
- Custom URI scheme deep linking

---

## Next Steps

### **Priority 1: Fix OAuth Double Login**
1. Implement Solution 1 (Android OAuth Client) OR
2. Implement Solution 2 (Session Exchange Timing) OR
3. Investigate PKCE code verifier storage in native context

### **Priority 2: Fix Wallet Connection**
1. Verify WalletConnect project configuration
2. Add Android origin to allow-list
3. Test with proper origin headers
4. Add better error handling and timeout logic

### **Priority 3: Improve Error Handling**
1. Add clear error messages for OAuth failures
2. Add retry mechanisms
3. Add loading states for wallet connection
4. Add timeout handling

---

## Conclusion

The Android APK has **two unresolved issues** that impact user experience:

1. **OAuth requires double login** - Root cause: Session exchange timing or PKCE flow in native context
2. **Wallet connection gets stuck** - Root cause: WalletConnect origin configuration or network issues

Both issues are **functional but not ideal** - users can work around them, but the experience is degraded.

**Recommended Action:** Implement Solution 1 (Android OAuth Client) for OAuth, and verify WalletConnect origin configuration for wallet connection.

---

**Report Generated:** November 17, 2025  
**Last Updated:** November 17, 2025

