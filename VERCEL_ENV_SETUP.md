# Vercel Environment Variables Setup for Production

## Critical Issue
The app is falling back to **demo mode** in production because `VITE_FCZ_BASE_BETS` is not set to `'1'` in Vercel.

## Required Environment Variables for Production

### 1. Enable On-Chain Betting (CRITICAL)
```
VITE_FCZ_BASE_BETS=1
```

### 2. Disable Demo Mode (CRITICAL)
```
VITE_FCZ_ENABLE_DEMO=0
```
OR simply **do not set** `VITE_FCZ_ENABLE_DEMO` at all (undefined = disabled)

### 3. Base Sepolia Configuration
```
VITE_FCZ_BASE_ENABLE=1
VITE_FCZ_BASE_CHAIN_ID=84532
VITE_FCZ_BASE_READONLY=0
VITE_FCZ_BASE_DEPOSITS=1
VITE_FCZ_BASE_WITHDRAWALS=1
```

### 4. USDC Token Configuration
```
VITE_USDC_ADDRESS_BASE_SEPOLIA=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_USDC_DECIMALS=6
```

### 5. Escrow Contract Address
```
VITE_BASE_ESCROW_ADDRESS=<your_deployed_escrow_contract_address>
```

### 6. WalletConnect
```
VITE_WC_PROJECT_ID=<your_walletconnect_project_id>
```

### 7. Supabase (should already be set)
```
VITE_SUPABASE_URL=<your_supabase_url>
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
```

## How to Set Environment Variables in Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project: https://vercel.com/dashboard
2. Select your project (Fan Club Z)
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key**: `VITE_FCZ_BASE_BETS`
   - **Value**: `1`
   - **Environment**: Select **Production**, **Preview**, and **Development** (or just Production)
   - Click **Save**
5. Repeat for all variables above

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Set environment variables
vercel env add VITE_FCZ_BASE_BETS production
# When prompted, enter: 1

vercel env add VITE_FCZ_BASE_ENABLE production
# When prompted, enter: 1

vercel env add VITE_FCZ_BASE_CHAIN_ID production
# When prompted, enter: 84532

# ... repeat for all variables
```

### Option 3: Bulk Import via Vercel Dashboard

1. Go to **Settings** → **Environment Variables**
2. Click **Import** (if available) or add them one by one
3. Use this format:
```
VITE_FCZ_BASE_BETS=1
VITE_FCZ_ENABLE_DEMO=0
VITE_FCZ_BASE_ENABLE=1
VITE_FCZ_BASE_CHAIN_ID=84532
VITE_FCZ_BASE_READONLY=0
VITE_FCZ_BASE_DEPOSITS=1
VITE_FCZ_BASE_WITHDRAWALS=1
VITE_USDC_ADDRESS_BASE_SEPOLIA=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_USDC_DECIMALS=6
VITE_BASE_ESCROW_ADDRESS=<your_address>
VITE_WC_PROJECT_ID=<your_project_id>
```

## After Setting Variables

1. **Redeploy** your application:
   - Go to **Deployments** tab
   - Click **...** (three dots) on the latest deployment
   - Click **Redeploy**
   - OR push a new commit to trigger a new deployment

2. **Verify** the variables are loaded:
   - Check the build logs for any environment variable warnings
   - Open browser console on production site
   - Check for `[FCZ-BET] mode detection` log
   - Should show: `{ FLAG_BASE_BETS: true, FLAG_DEMO: false, isCryptoMode: true }`

## Verification Checklist

After deployment, verify:

- [ ] Console shows `FLAG_BASE_BETS: true`
- [ ] Console shows `FLAG_DEMO: false` (or undefined)
- [ ] Console shows `isCryptoMode: true`
- [ ] Bet placement uses `/api/predictions/:id/place-bet` endpoint (not demo mode)
- [ ] Wallet connection is required for betting
- [ ] Escrow balance is read from on-chain contract

## Troubleshooting

### Still showing demo mode?
1. Check Vercel environment variables are set correctly
2. Ensure variables are set for **Production** environment (not just Preview/Development)
3. Redeploy after setting variables
4. Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Variables not appearing in build?
- Vercel only includes `VITE_*` variables in client builds
- Make sure variable names start with `VITE_`
- Check build logs for any warnings about missing variables

### Build fails?
- Check that all required variables are set
- Verify variable values are correct (no extra spaces, correct format)
- Check Vercel build logs for specific error messages

## Quick Fix Command (if using Vercel CLI)

```bash
# Set the critical variable
vercel env add VITE_FCZ_BASE_BETS production
# Enter: 1

# Remove demo mode if it exists
vercel env rm VITE_FCZ_ENABLE_DEMO production

# Redeploy
vercel --prod
```

## Debug: Check Current Environment Variables

To verify what environment variables are currently set in production, add this to your browser console on the production site:

```javascript
// Check betting mode configuration
console.log('🔍 Betting Mode Configuration:', {
  VITE_FCZ_BASE_BETS: import.meta.env.VITE_FCZ_BASE_BETS,
  VITE_FCZ_ENABLE_DEMO: import.meta.env.VITE_FCZ_ENABLE_DEMO,
  ENABLE_BASE_BETS: import.meta.env.ENABLE_BASE_BETS,
  FCZ_ENABLE_BASE_BETS: import.meta.env.FCZ_ENABLE_BASE_BETS,
  VITE_FCZ_BASE_ENABLE: import.meta.env.VITE_FCZ_BASE_ENABLE,
  FLAG_BASE_BETS: (import.meta.env.VITE_FCZ_BASE_BETS === '1' || 
                   import.meta.env.ENABLE_BASE_BETS === '1' ||
                   import.meta.env.FCZ_ENABLE_BASE_BETS === '1' ||
                   import.meta.env.VITE_FCZ_BASE_ENABLE === '1'),
  FLAG_DEMO: import.meta.env.VITE_FCZ_ENABLE_DEMO === '1',
  isCryptoMode: (import.meta.env.VITE_FCZ_BASE_BETS === '1' || 
                 import.meta.env.ENABLE_BASE_BETS === '1' ||
                 import.meta.env.FCZ_ENABLE_BASE_BETS === '1' ||
                 import.meta.env.VITE_FCZ_BASE_ENABLE === '1') && 
                import.meta.env.VITE_FCZ_ENABLE_DEMO !== '1'
});
```

**Expected Output (when correctly configured):**
```javascript
{
  VITE_FCZ_BASE_BETS: "1",
  VITE_FCZ_ENABLE_DEMO: undefined,  // or not set
  FLAG_BASE_BETS: true,
  FLAG_DEMO: false,
  isCryptoMode: true
}
```

**Current Output (incorrect - showing demo mode):**
```javascript
{
  VITE_FCZ_BASE_BETS: undefined,  // ❌ NOT SET
  VITE_FCZ_ENABLE_DEMO: undefined,
  FLAG_BASE_BETS: false,  // ❌ Should be true
  FLAG_DEMO: false,
  isCryptoMode: false  // ❌ Should be true
}
```

