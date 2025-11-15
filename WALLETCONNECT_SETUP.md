# WalletConnect Configuration Fix

## Issue
Production is showing 403 Forbidden errors:
- `Origin https://app.fanclubz.app not found on Allowlist`
- `Failed to fetch remote project configuration`
- WalletConnect not working on mobile

## Root Cause
The domain `app.fanclubz.app` is not whitelisted in your WalletConnect project settings.

## Solution

### Step 1: Add Domain to WalletConnect Allowlist

1. Go to https://cloud.reown.com (formerly cloud.walletconnect.com)
2. Sign in with your WalletConnect account
3. Select your project (Project ID: `a376a3c48ca99bd80c5b30a37652a5ae`)
4. Navigate to **Project Settings** → **Allowed Domains** (or **App URLs**)
5. Add the following domains:
   - `https://app.fanclubz.app`
   - `https://fanclubz.app` (if using root domain)
   - `https://www.fanclubz.app` (if using www subdomain)
6. Save the changes

### Step 2: Verify Environment Variable

Ensure `VITE_WALLETCONNECT_PROJECT_ID` is set in Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify `VITE_WALLETCONNECT_PROJECT_ID=a376a3c48ca99bd80c5b30a37652a5ae` exists
3. If missing, add it for Production, Preview, and Development environments
4. Redeploy after adding

### Step 3: Test

After adding the domain:
1. Wait 1-2 minutes for changes to propagate
2. Clear browser cache
3. Try connecting wallet again
4. WalletConnect should now work without 403 errors

## Mobile Browser Wallet

The "Browser Wallet" option works with:
- **iOS**: Safari with MetaMask or other Web3 wallets installed
- **Android**: Chrome with MetaMask or other Web3 wallets installed
- **Desktop**: MetaMask extension, Coinbase Wallet extension, etc.

If WalletConnect fails, users can still use Browser Wallet on mobile devices that have wallet apps installed.

## Troubleshooting

### Still seeing 403 errors?
- Double-check the domain is exactly `https://app.fanclubz.app` (with https://)
- Ensure no trailing slashes
- Wait a few minutes for propagation
- Check project ID matches in both WalletConnect dashboard and Vercel

### Mobile wallet not detected?
- User must have MetaMask or compatible wallet app installed
- On iOS, wallet must be configured to work with Safari
- Try WalletConnect as fallback option

