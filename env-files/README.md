# Environment Setup Package

Automated environment configuration for Fan Club Z escrow deployment.

## Quick Start

```bash
cd your-project-root
./env-files/setup-env.sh
```

The script will prompt you for:
1. **Deployer Private Key** - Your wallet private key (from MetaMask)
2. **WalletConnect Project ID** - Get from https://cloud.walletconnect.com/
3. **Alchemy API Key** (optional) - For better RPC performance
4. **Basescan API Key** (optional) - For automatic contract verification

## What It Creates

### 1. `contracts/.env`
Deployment configuration for Foundry/Hardhat:
- `DEPLOYER_PRIVATE_KEY` - For contract deployment
- `BASE_SEPOLIA_RPC_URL` - RPC endpoint
- `USDC_ADDRESS` - Base Sepolia USDC token
- `PLATFORM_FEE_BPS` - Escrow fee configuration

### 2. `server/.env`
Backend server configuration:
- Database connection strings
- `BASE_ESCROW_ADDRESS` - (Empty, fill after deployment)
- Feature flags for Base Sepolia
- Payment configuration

### 3. `client/.env.local`
Frontend client configuration:
- `VITE_WC_PROJECT_ID` - WalletConnect integration
- `VITE_BASE_ESCROW_ADDRESS` - (Empty, fill after deployment)
- USDC token configuration
- Base Sepolia RPC endpoints
- Feature flags

## Pre-Configured Values

All correct values are already set:
- ✅ Base Sepolia Chain ID: `84532`
- ✅ Base Sepolia RPC URL: `https://sepolia.base.org`
- ✅ USDC Address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- ✅ All feature flags enabled

## After Running Setup

1. **Deploy Contract:**
   ```bash
   cd contracts
   forge script script/DeployEscrow.s.sol:DeployEscrow \
     --rpc-url $BASE_SEPOLIA_RPC_URL \
     --private-key $DEPLOYER_PRIVATE_KEY \
     --broadcast
   ```

2. **Update Addresses:**
   - Copy deployed address to `server/.env`: `BASE_ESCROW_ADDRESS=0x...`
   - Copy to `client/.env.local`: `VITE_BASE_ESCROW_ADDRESS=0x...`

3. **Restart Servers:**
   ```bash
   cd server && npm run dev
   cd client && npm run dev
   ```

## Safety

- Script backs up existing `.env` files
- Private keys are not logged or saved anywhere else
- All files are `.gitignore`d by default
- Prompts for confirmation if files exist

## Troubleshooting

**"Permission denied"**
```bash
chmod +x env-files/setup-env.sh
```

**"No such file or directory"**
- Make sure you're in the project root
- Run: `./env-files/setup-env.sh` (not from inside env-files/)

**Files already exist**
- Script will prompt before overwriting
- Creates backups automatically

