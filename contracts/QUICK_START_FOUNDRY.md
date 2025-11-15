# Foundry Deployment - Quick Start (10 minutes)

## Step 1: Install Foundry (2 min)

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify:
```bash
forge --version
```

## Step 2: Configure Environment (2 min)

```bash
cd contracts
cp ENV_TEMPLATE.txt .env
# Edit .env with your values
```

Required:
- `DEPLOYER_PRIVATE_KEY` - Your wallet private key (with ETH for gas)
- `USDC_ADDRESS` - Base Sepolia USDC address (default provided)
- `BASE_SEPOLIA_RPC_URL` - RPC endpoint (default provided)

Optional:
- `BASESCAN_API_KEY` - For automatic contract verification

## Step 3: Install Dependencies (1 min)

```bash
forge install foundry-rs/forge-std --no-commit
forge build
```

## Step 4: Deploy Contract (3 min)

```bash
./deploy.sh
```

Or manually:
```bash
forge script script/DeployEscrow.s.sol:DeployEscrow \
    --rpc-url https://sepolia.base.org \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast
```

## Step 5: Update Environment Files (2 min)

After deployment, copy the contract address to:

**Server (.env):**
```bash
BASE_ESCROW_ADDRESS=0x...your_address...
```

**Client (.env.local):**
```bash
VITE_BASE_ESCROW_ADDRESS=0x...your_address...
```

## Step 6: Verify Configuration

```bash
./verify-config.sh
```

## Step 7: Restart Servers

```bash
# Kill existing
lsof -ti:5174,3001 | xargs kill -9

# Restart
cd ../client && npm run dev &
cd ../server && npm run dev &
```

## ✅ Done!

Your escrow contract is deployed and configured. Test it:
1. Go to http://localhost:5174/wallet
2. Connect wallet
3. Try depositing 1 USDC

## Troubleshooting

**"Forge not found"**
→ Install Foundry (Step 1)

**"Insufficient funds"**  
→ Get Base Sepolia ETH from faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

**"Invalid address"**
→ Check USDC_ADDRESS matches Base Sepolia USDC token

**"Contract not found"**
→ Verify contract address is correct in .env files

