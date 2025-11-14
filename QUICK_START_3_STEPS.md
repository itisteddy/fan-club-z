# 🚀 Quick Start - 3 Steps to Deploy Escrow

Complete escrow deployment in ~15 minutes.

## Step 1: Set Up Environment (2 min)

```bash
cd your-project-root
./env-files/setup-env.sh
```

**Enter when prompted:**
- Your private key (from MetaMask)
- WalletConnect project ID (from https://cloud.walletconnect.com/)
- Alchemy API key (optional)
- Basescan API key (optional)

**✅ Done!** All 3 env files created automatically:
- `contracts/.env`
- `server/.env`
- `client/.env.local`

---

## Step 2: Deploy Contract (3 min)

```bash
cd contracts

# Install dependencies (if not done)
forge install foundry-rs/forge-std --no-commit

# Build contracts
forge build

# Deploy
forge script script/DeployEscrow.s.sol:DeployEscrow \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast -vvvv
```

**📋 Copy the escrow address from output** (look for "Deployed to:" or contract address)

---

## Step 3: Update & Test (2 min)

### Update Environment Files

**Edit `server/.env`:**
```bash
BASE_ESCROW_ADDRESS=0x...your_deployed_address...
```

**Edit `client/.env.local`:**
```bash
VITE_BASE_ESCROW_ADDRESS=0x...your_deployed_address...
```

### Restart Apps

```bash
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

### Test Deposit

1. Go to http://localhost:5174/wallet
2. Connect wallet
3. Click "Deposit"
4. Enter 1 USDC
5. Approve in wallet

**✅ Done!** No more "Something went wrong" error!

---

## 📥 Pre-Configured Values

All correct values are already set:

✅ **Base Sepolia Chain ID:** `84532`  
✅ **Base Sepolia RPC URL:** `https://sepolia.base.org`  
✅ **USDC Token Address:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`  
✅ **All feature flags:** Enabled  

**You only need to provide:**
- Your private key (testnet wallet)
- WalletConnect project ID
- Deployed escrow address (after deployment)

---

## ⏱️ Total Time Breakdown

| Step | Time | Description |
|------|------|-------------|
| Environment setup | 2 min | Automated script |
| Install/build | 1 min | Forge dependencies |
| Deploy contract | 2 min | On-chain deployment |
| Update addresses | 1 min | Edit 2 files |
| Restart servers | 1 min | Start dev servers |
| Test deposit | 2 min | Verify it works |
| **Total** | **~9 min** | **End to end** |

---

## 💡 Key Features

✅ **Automated Setup** - One script creates all env files  
✅ **Cursor-Friendly** - Templates you can copy/paste  
✅ **Production-Ready** - Tested and verified  
✅ **Security-First** - Proper .gitignore handling  
✅ **Complete Docs** - 20+ guide files  

---

## 🎯 Verification

After setup, verify everything is configured:

```bash
cd contracts
./verify-config.sh
```

This checks:
- ✅ Server `.env` configuration
- ✅ Client `.env.local` configuration
- ✅ Contract deployment configuration
- ✅ Address format validation

---

## 🔧 Troubleshooting

### "Permission denied" on setup-env.sh
```bash
chmod +x env-files/setup-env.sh
```

### "No such file or directory"
- Make sure you're in project root: `cd your-project-root`
- Run: `./env-files/setup-env.sh`

### "Insufficient funds" during deployment
- Get Base Sepolia ETH from faucet
- Ensure deployer wallet has ETH for gas

### Contract address not showing
- Check deployment output for "Deployed to:" line
- Verify on Base Sepolia explorer: https://sepolia.basescan.org

### Balance still $0.00
- Verify wallet is on Base Sepolia network
- Check USDC address matches your token
- Clear browser cache and reconnect wallet

---

## 📚 Additional Resources

- **Full Deployment Guide:** `contracts/FOUNDRY_DEPLOYMENT.md`
- **Quick Start Foundry:** `contracts/QUICK_START_FOUNDRY.md`
- **Configuration Verification:** `contracts/verify-config.sh`
- **Environment Setup:** `env-files/README.md`

---

## 🎉 You're All Set!

Everything is ready. Just follow the 3 steps above and you'll have a working escrow deployment in minutes!

**No more "Something went wrong" error!** ✨

