#!/bin/bash

# Fan Club Z Escrow Deployment Script
# Deploys EscrowUSDC contract to Base Sepolia with validation

set -e  # Exit on error

echo "🚀 Fan Club Z Escrow Deployment"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please copy .env.example to .env and fill in your values"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Validate required variables
REQUIRED_VARS=("DEPLOYER_PRIVATE_KEY" "USDC_ADDRESS")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ] || [ "${!VAR}" == "your_${VAR,,}_here" ]; then
        echo -e "${RED}❌ Error: $VAR is not set or has placeholder value${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ Environment variables validated${NC}"

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo -e "${YELLOW}⚠️  Forge not found. Installing Foundry...${NC}"
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
fi

echo -e "${GREEN}✅ Foundry is installed${NC}"

# Install dependencies
echo "📦 Installing dependencies..."
forge install foundry-rs/forge-std --no-commit || true

# Build contracts
echo "🔨 Building contracts..."
forge build

# Deploy contract
echo "🚀 Deploying EscrowUSDC to Base Sepolia..."

DEPLOY_OUTPUT=$(forge script script/DeployEscrow.s.sol:DeployEscrow \
    --rpc-url ${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org} \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key ${BASESCAN_API_KEY:-} \
    -vvv)

# Extract contract address from output
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Deployed to: \K0x[a-fA-F0-9]{40}' || \
                   echo "$DEPLOY_OUTPUT" | grep -oP 'Contract deployed at: \K0x[a-fA-F0-9]{40}' || \
                   echo "$DEPLOY_OUTPUT" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}❌ Error: Could not extract contract address from deployment output${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Deployment Successful!${NC}"
echo "================================"
echo "Contract Address: $CONTRACT_ADDRESS"
echo "Network: Base Sepolia"
echo "Explorer: https://sepolia.basescan.org/address/$CONTRACT_ADDRESS"
echo ""
echo "📝 Next Steps:"
echo "1. Add this address to server/.env as BASE_ESCROW_ADDRESS"
echo "2. Add this address to client/.env.local as VITE_BASE_ESCROW_ADDRESS"
echo "3. Restart both servers"
echo ""

# Save deployment info
cat > deployment-info.txt << EOF
# Escrow Deployment Information
DEPLOYED_AT=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
CONTRACT_ADDRESS=$CONTRACT_ADDRESS
NETWORK=base-sepolia
CHAIN_ID=84532
USDC_ADDRESS=${USDC_ADDRESS}
DEPLOYER=$(cast wallet address $DEPLOYER_PRIVATE_KEY)
EXPLORER_URL=https://sepolia.basescan.org/address/$CONTRACT_ADDRESS
EOF

echo -e "${GREEN}✅ Deployment info saved to deployment-info.txt${NC}"

