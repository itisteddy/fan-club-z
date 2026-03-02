# Environment Variables Update - Phase 4A-4D Deployment

## 🚨 NEW Environment Variables Required

### **Render (Backend) - NEW Variables:**

#### **Admin Finalization Relayer** (Phase 3B/4A)
These are **REQUIRED** for admin finalization to work:

```bash
# Relayer Configuration (for admin on-chain finalization)
RELAYER_PRIVATE_KEY=0x...your_relayer_wallet_private_key...
RELAYER_RPC_URL=https://sepolia.base.org
RELAYER_CHAIN_ID=84532
```

**Important Notes:**
- `RELAYER_PRIVATE_KEY`: This should be a **dedicated wallet** for admin finalization
  - **DO NOT** use your personal wallet or the creator's wallet
  - This wallet will submit on-chain finalization transactions
  - Ensure it has enough ETH for gas fees
- `RELAYER_RPC_URL`: Should match your `RPC_URL` (Base Sepolia: `https://sepolia.base.org`)
- `RELAYER_CHAIN_ID`: Should match your `CHAIN_ID` (Base Sepolia: `84532`)

#### **Admin API Key** (Phase 0A - Security)
```bash
# Admin API Key (for securing admin endpoints)
ADMIN_API_KEY=your_secure_random_string_here
```

**Important:**
- This should be a **strong, random string** (at least 32 characters)
- Used to protect admin endpoints like `/api/v2/admin/seed-database`
- Keep this **secret** - never commit to git

---

## ✅ Existing Variables (No Changes Needed)

These should already be set, but verify they exist:

### **Render (Backend):**
```bash
# Existing (verify these are set)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_URL=your_supabase_url
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://base-sepolia-rpc.publicnode.com
BASE_ESCROW_ADDRESS=your_escrow_contract_address
USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115
ENABLE_BASE_DEPOSITS=1
BASE_DEPOSITS_MOCK=0
PAYMENTS_ENABLE=1
RUNTIME_ENV=prod
PEXELS_API_KEY=your_pexels_key
UNSPLASH_ACCESS_KEY=your_unsplash_key
```

### **Vercel (Frontend):**
```bash
# Existing (verify these are set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://fan-club-z.onrender.com
VITE_APP_URL=https://app.fanclubz.app
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_BASE_ESCROW_ADDRESS=your_escrow_contract_address
VITE_FCZ_BASE_CHAIN_ID=84532
VITE_USDC_ADDRESS_BASE_SEPOLIA=0x5B966ca41aB58E50056EE1711c9766Ca3382F115
```

---

## 📋 Quick Setup Checklist

### **Render Dashboard:**
1. ✅ Go to your Render service dashboard
2. ✅ Navigate to **Environment** tab
3. ✅ Add these **NEW** variables:
   - `RELAYER_PRIVATE_KEY` (generate a new wallet, export private key)
   - `RELAYER_RPC_URL=https://sepolia.base.org`
   - `RELAYER_CHAIN_ID=84532`
   - `ADMIN_API_KEY` (generate a secure random string)
4. ✅ Verify existing variables are still set
5. ✅ **Redeploy** the service after adding variables

### **Vercel Dashboard:**
1. ✅ Go to your Vercel project dashboard
2. ✅ Navigate to **Settings** → **Environment Variables**
3. ✅ Verify existing variables are set (no new variables needed for Phase 4)
4. ✅ **Redeploy** if needed

---

## 🔐 Security Best Practices

### **Generating RELAYER_PRIVATE_KEY:**
```bash
# Option 1: Use MetaMask or another wallet
# 1. Create a new account
# 2. Export private key (keep it secure!)
# 3. Fund with ETH for gas fees

# Option 2: Generate programmatically (for testing only)
# Use a secure random generator - DO NOT use this in production
```

### **Generating ADMIN_API_KEY:**
```bash
# Use a secure random string generator
# Example (on macOS/Linux):
openssl rand -hex 32

# Or use an online generator (ensure it's secure)
# Minimum 32 characters, mix of letters, numbers, symbols
```

---

## ⚠️ Important Notes

1. **Relayer Wallet:**
   - This is a **server-side wallet** that will submit on-chain transactions
   - It should be **separate** from user wallets
   - Ensure it has **sufficient ETH** for gas fees
   - Keep the private key **secure** - if compromised, rotate immediately

2. **Admin API Key:**
   - Used to protect admin endpoints
   - If compromised, rotate immediately
   - Never log or expose this value

3. **CORS Configuration:**
   - Already configured in code (no env vars needed)
   - Whitelisted origins: `fanclubz.app`, `app.fanclubz.app`, `localhost:5173`, `localhost:3000`

4. **After Adding Variables:**
   - **Redeploy** your Render service
   - Test admin finalization endpoint
   - Verify admin seed endpoint is protected

---

## 🧪 Testing After Deployment

1. **Test Admin Finalization:**
   ```bash
   curl -X POST https://fan-club-z.onrender.com/api/v2/admin/settlements/{predictionId}/finalize-onchain \
     -H "Content-Type: application/json" \
     -H "X-Admin-Key: your_admin_key" \
     -d '{"actorId": "your_user_id", "reason": "Test"}'
   ```

2. **Test Admin Seed Protection:**
   ```bash
   # Should return 401 without X-Admin-Key header
   curl -X POST https://fan-club-z.onrender.com/api/v2/admin/seed-database
   
   # Should work with header
   curl -X POST https://fan-club-z.onrender.com/api/v2/admin/seed-database \
     -H "X-Admin-Key: your_admin_key"
   ```

---

## 📝 Summary

**NEW Variables to Add:**
- `RELAYER_PRIVATE_KEY` (Render)
- `RELAYER_RPC_URL` (Render)
- `RELAYER_CHAIN_ID` (Render)
- `ADMIN_API_KEY` (Render)

**No Changes Needed:**
- Vercel environment variables (all existing)
- Most Render variables (verify they exist)

**After Adding:**
- Redeploy Render service
- Test admin endpoints
- Monitor for errors

