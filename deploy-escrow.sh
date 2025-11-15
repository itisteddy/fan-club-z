#!/bin/bash

# Fan Club Z - Complete Escrow Deployment Script
# Automatically deploys contract and updates all environment files

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Fan Club Z - Complete Escrow Deployment${NC}"
echo "=============================================="
echo ""

# Get project root
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}📁 Project root: $PROJECT_ROOT${NC}"
echo ""

# Check if contracts/.env exists
if [ ! -f "contracts/.env" ]; then
    echo -e "${RED}❌ Error: contracts/.env not found${NC}"
    echo "Please run ./env-files/setup-env.sh first"
    exit 1
fi

# Load environment variables from contracts/.env
export $(cat contracts/.env | grep -v '^#' | grep -v '^$' | xargs)

# Validate required variables
if [ -z "$DEPLOYER_PRIVATE_KEY" ] || [ "$DEPLOYER_PRIVATE_KEY" == "your_deployer_private_key_here" ]; then
    echo -e "${RED}❌ Error: DEPLOYER_PRIVATE_KEY not set in contracts/.env${NC}"
    exit 1
fi

if [ -z "$USDC_ADDRESS" ]; then
    echo -e "${RED}❌ Error: USDC_ADDRESS not set in contracts/.env${NC}"
    exit 1
fi

RPC_URL=${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}
echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo -e "   RPC URL: ${RPC_URL}"
echo -e "   USDC Address: ${USDC_ADDRESS:0:10}...${USDC_ADDRESS: -6}"
echo ""

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo -e "${YELLOW}⚠️  Forge not found. Installing Foundry...${NC}"
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
fi

echo -e "${GREEN}✅ Foundry is installed${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "contracts/lib/forge-std" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    cd contracts
    forge install foundry-rs/forge-std --no-commit || true
    cd ..
fi

# Build contracts
echo -e "${BLUE}🔨 Building contracts...${NC}"
cd contracts
forge build
cd ..
echo -e "${GREEN}✅ Contracts built successfully${NC}"
echo ""

# Deploy contract
echo -e "${BLUE}🚀 Deploying Escrow contract to Base Sepolia...${NC}"
echo -e "${YELLOW}   This may take 30-60 seconds...${NC}"
echo ""

cd contracts

# Run deployment and capture output
DEPLOY_OUTPUT=$(forge script script/DeployEscrow.s.sol:DeployEscrow \
    --rpc-url "$RPC_URL" \
    --private-key "$DEPLOYER_PRIVATE_KEY" \
    --broadcast \
    -vvv 2>&1)

cd ..

# Extract contract address from output
# Try multiple patterns
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Escrow deployed at:\s*\K0x[a-fA-F0-9]{40}' || \
                   echo "$DEPLOY_OUTPUT" | grep -oP 'Deployed to:\s*\K0x[a-fA-F0-9]{40}' || \
                   echo "$DEPLOY_OUTPUT" | grep -oP 'Contract deployed at:\s*\K0x[a-fA-F0-9]{40}' || \
                   echo "$DEPLOY_OUTPUT" | grep -oP 'contract deployed.*?\K0x[a-fA-F0-9]{40}' || \
                   echo "$DEPLOY_OUTPUT" | grep -oE '0x[a-fA-F0-9]{40}' | tail -1)

if [ -z "$CONTRACT_ADDRESS" ] || [ ${#CONTRACT_ADDRESS} -ne 42 ]; then
    echo -e "${RED}❌ Error: Could not extract contract address from deployment${NC}"
    echo ""
    echo "Deployment output:"
    echo "$DEPLOY_OUTPUT"
    echo ""
    echo -e "${YELLOW}Please check the output above and manually find the contract address${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed successfully!${NC}"
echo -e "   ${CYAN}Contract Address: ${CONTRACT_ADDRESS}${NC}"
echo ""

# Update server/.env
echo -e "${BLUE}📝 Updating server/.env...${NC}"
if [ -f "server/.env" ]; then
    # Remove existing BASE_ESCROW_ADDRESS line if present
    sed -i.bak '/^BASE_ESCROW_ADDRESS=/d' server/.env
    
    # Add new address
    echo "" >> server/.env
    echo "# Escrow contract address (auto-updated by deploy-escrow.sh)" >> server/.env
    echo "BASE_ESCROW_ADDRESS=$CONTRACT_ADDRESS" >> server/.env
    
    echo -e "${GREEN}✅ server/.env updated${NC}"
else
    echo -e "${YELLOW}⚠️  server/.env not found, creating it...${NC}"
    mkdir -p server
    cat > server/.env << EOF
# Fan Club Z Server Configuration
BASE_ESCROW_ADDRESS=$CONTRACT_ADDRESS
EOF
    echo -e "${GREEN}✅ server/.env created${NC}"
fi

# Update client/.env.local
echo -e "${BLUE}📝 Updating client/.env.local...${NC}"
if [ -f "client/.env.local" ]; then
    # Remove existing VITE_BASE_ESCROW_ADDRESS line if present
    sed -i.bak '/^VITE_BASE_ESCROW_ADDRESS=/d' client/.env.local
    
    # Add new address
    echo "" >> client/.env.local
    echo "# Escrow contract address (auto-updated by deploy-escrow.sh)" >> client/.env.local
    echo "VITE_BASE_ESCROW_ADDRESS=$CONTRACT_ADDRESS" >> client/.env.local
    
    echo -e "${GREEN}✅ client/.env.local updated${NC}"
else
    echo -e "${YELLOW}⚠️  client/.env.local not found, creating it...${NC}"
    mkdir -p client
    cat > client/.env.local << EOF
# Fan Club Z Client Configuration
VITE_BASE_ESCROW_ADDRESS=$CONTRACT_ADDRESS
EOF
    echo -e "${GREEN}✅ client/.env.local created${NC}"
fi

# Save deployment info
DEPLOY_INFO="deployment-$(date +%Y%m%d-%H%M%S).txt"
cat > "$DEPLOY_INFO" << EOF
# Fan Club Z Escrow Deployment
Deployed At: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Contract Address: $CONTRACT_ADDRESS
Network: Base Sepolia
Chain ID: 84532
RPC URL: $RPC_URL
USDC Address: $USDC_ADDRESS
Explorer: https://sepolia.basescan.org/address/$CONTRACT_ADDRESS
EOF

echo ""
echo -e "${GREEN}✅ Deployment info saved to: $DEPLOY_INFO${NC}"
echo ""

# Summary
echo "=============================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "=============================================="
echo ""
echo -e "${CYAN}📋 Summary:${NC}"
echo "   Contract Address: ${CONTRACT_ADDRESS}"
echo "   Network: Base Sepolia"
echo "   Explorer: https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}"
echo ""
echo -e "${CYAN}📝 Files Updated:${NC}"
echo "   ✅ server/.env"
echo "   ✅ client/.env.local"
echo "   ✅ $DEPLOY_INFO"
echo ""
echo -e "${CYAN}🚀 Next Steps:${NC}"
echo ""
echo "   1. Restart servers:"
echo "      Terminal 1: ${BLUE}cd server && npm run dev${NC}"
echo "      Terminal 2: ${BLUE}cd client && npm run dev${NC}"
echo ""
echo "   2. Test deposit:"
echo "      - Go to http://localhost:5174/wallet"
echo "      - Connect wallet"
echo "      - Click 'Deposit'"
echo "      - Enter 1 USDC"
echo "      - Approve in wallet"
echo ""
echo -e "${GREEN}🎉 Done! No more 'Something went wrong' error!${NC}"
echo ""
