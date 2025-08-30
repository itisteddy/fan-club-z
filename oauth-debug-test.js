// Quick OAuth test - Run in browser console
// Go to your app and paste this in DevTools console

console.log('=== OAuth Debug Info ===');
console.log('Current URL:', window.location.href);
console.log('Hostname:', window.location.hostname);
console.log('Is Development:', window.location.hostname === 'localhost');

// Test environment variables
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);

// Test expected redirect URL
const isDevelopment = window.location.hostname === 'localhost';
const expectedRedirectTo = isDevelopment 
  ? 'http://localhost:5173/auth/callback'
  : 'https://fanclubz-version2-0.vercel.app/auth/callback';
console.log('Expected Redirect URL:', expectedRedirectTo);

// Test if auth callback page exists
console.log('Testing auth callback route...');
const testUrl = expectedRedirectTo;
fetch(testUrl, { method: 'HEAD' })
  .then(response => {
    console.log('Auth callback route status:', response.status);
    if (response.status === 200) {
      console.log('✅ Auth callback route exists');
    } else {
      console.log('❌ Auth callback route not found');
    }
  })
  .catch(error => {
    console.log('❌ Error testing auth callback route:', error);
  });
