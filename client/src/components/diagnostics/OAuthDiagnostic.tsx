import { useEffect } from 'react';

/**
 * OAuth Redirect Diagnostic Component
 * 
 * Add this to your app temporarily to debug OAuth redirect issues
 * Usage: Import and render <OAuthDiagnostic /> in your main App component
 */
export function OAuthDiagnostic() {
  useEffect(() => {
    console.log('═══════════════════════════════════════');
    console.log('🔍 OAUTH REDIRECT DIAGNOSTIC');
    console.log('═══════════════════════════════════════');
    console.log('Environment Variables:');
    console.log('  VITE_APP_URL:', import.meta.env.VITE_APP_URL);
    console.log('  VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('  VITE_AUTH_REDIRECT_URL:', import.meta.env.VITE_AUTH_REDIRECT_URL);
    console.log('  MODE:', import.meta.env.MODE);
    console.log('  DEV:', import.meta.env.DEV);
    console.log('  PROD:', import.meta.env.PROD);
    console.log('');
    console.log('Current Location:');
    console.log('  hostname:', window.location.hostname);
    console.log('  origin:', window.location.origin);
    console.log('  href:', window.location.href);
    console.log('');
    console.log('Expected OAuth Redirect:');
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalDev) {
      console.log('  ✅ Should redirect to:', `${window.location.origin}/auth/callback`);
    } else {
      console.log('  ✅ Should redirect to: https://app.fanclubz.app/auth/callback');
    }
    console.log('═══════════════════════════════════════');
  }, []);

  return null; // This component doesn't render anything
}
