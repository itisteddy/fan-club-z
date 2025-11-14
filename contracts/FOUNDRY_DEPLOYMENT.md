# Foundry Deployment Guide

This guide provides Foundry-based deployment for the FanClubZ Escrow contract as an alternative to Hardhat.

## Prerequisites

1. **Install Foundry:**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Verify Installation:**
   ```bash
   forge --version
   cast --version
   ```

## Setup

### 1. Create Environment File

Create `contracts/.env` from the template:

```bash
cd contracts
cp .env.example .env  # If .env.example exists
# Or create manually with these variables:
```

Required variables:
```bash
DEPLOYER_PRIVATE_KEY=your_private_key_here
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
PLATFORM_FEE_BPS=250
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_api_key_here  # Optional, for verification
```

### 2. Install Dependencies

```bash
cd contracts
forge install foundry-rs/forge-std --no-commit
```

### 3. Build Contracts

```bash
forge build
```

## Deployment

### Option 1: Using the Deployment Script (Recommended)

```bash
cd contracts
./deploy.sh
```

This script will:
- Validate environment variables
- Build contracts
- Deploy to Base Sepolia
- Verify on Basescan (if API key provided)
- Save deployment info to `deployment-info.txt`

### Option 2: Manual Deployment

```bash
forge script script/DeployEscrow.s.sol:DeployEscrow \
    --rpc-url https://sepolia.base.org \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY
```

## Post-Deployment

After deployment, update your environment files:

### Server (.env)
```bash
BASE_ESCROW_ADDRESS=0x...your_deployed_address...
```

### Client (.env.local)
```bash
VITE_BASE_ESCROW_ADDRESS=0x...your_deployed_address...
```

Then restart both servers:
```bash
# Kill existing servers
lsof -ti:5174,3001 | xargs kill -9

# Restart client
cd client && npm run dev &

# Restart server  
cd server && npm run dev &
```

## Verification

Run the verification script:
```bash
./verify-config.sh
```

This checks:
- ✅ Server .env configuration
- ✅ Client .env.local configuration
- ✅ Contract deployment configuration
- ✅ Address format validation

## Troubleshooting

### "Forge not found"
Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

### "Insufficient funds"
Ensure deployer wallet has ETH on Base Sepolia for gas fees.

### "Contract verification failed"
- Check Basescan API key is correct
- Wait a few minutes after deployment before verifying
- Verify manually on Basescan: https://sepolia.basescan.org

### "Invalid address"
- Ensure USDC_ADDRESS matches the Base Sepolia USDC token
- Default: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Comparison: Foundry vs Hardhat

| Feature | Foundry | Hardhat |
|---------|---------|---------|
| Speed | ⚡ Very Fast | 🐢 Slower |
| Testing | ✅ Built-in fuzzing | ✅ JavaScript tests |
| Scripts | ✅ Solidity scripts | ✅ JavaScript |
| Debugging | ✅ Advanced tracing | ✅ Good |
| Learning Curve | 🎯 Steeper | 📚 Easier |

**Recommendation:** Use Foundry if you want faster builds and advanced testing. Hardhat is fine for simpler workflows.

## Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Base Sepolia Explorer](https://sepolia.basescan.org)
- [Base Docs](https://docs.base.org/)

