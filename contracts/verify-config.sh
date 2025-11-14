#!/bin/bash

# Configuration Verification Script
# Checks if all required environment variables are set correctly

set -e

echo "🔍 Verifying Configuration..."
echo "================================"

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check server .env
echo -e "\n${BLUE}📋 Server Configuration${NC}"
if [ -f "../server/.env" ]; then
    echo -e "${GREEN}✅ server/.env exists${NC}"
    
    # Check for BASE_ESCROW_ADDRESS
    if grep -q "BASE_ESCROW_ADDRESS" ../server/.env; then
        ESCROW_ADDR=$(grep "BASE_ESCROW_ADDRESS" ../server/.env | cut -d '=' -f2 | tr -d ' "')
        if [ -z "$ESCROW_ADDR" ] || [ "$ESCROW_ADDR" == "your_escrow_address_here" ]; then
            echo -e "${RED}❌ BASE_ESCROW_ADDRESS is not set or has placeholder value${NC}"
            ((ERRORS++))
        else
            echo -e "${GREEN}✅ BASE_ESCROW_ADDRESS is set: ${ESCROW_ADDR:0:10}...${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  BASE_ESCROW_ADDRESS not found in server/.env${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ server/.env not found${NC}"
    ((ERRORS++))
fi

# Check client .env.local
echo -e "\n${BLUE}📋 Client Configuration${NC}"
if [ -f "../client/.env.local" ]; then
    echo -e "${GREEN}✅ client/.env.local exists${NC}"
    
    # Check for VITE_BASE_ESCROW_ADDRESS
    if grep -q "VITE_BASE_ESCROW_ADDRESS" ../client/.env.local; then
        CLIENT_ESCROW=$(grep "VITE_BASE_ESCROW_ADDRESS" ../client/.env.local | cut -d '=' -f2 | tr -d ' "')
        if [ -z "$CLIENT_ESCROW" ] || [ "$CLIENT_ESCROW" == "your_escrow_address_here" ]; then
            echo -e "${RED}❌ VITE_BASE_ESCROW_ADDRESS is not set or has placeholder value${NC}"
            ((ERRORS++))
        else
            echo -e "${GREEN}✅ VITE_BASE_ESCROW_ADDRESS is set: ${CLIENT_ESCROW:0:10}...${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  VITE_BASE_ESCROW_ADDRESS not found in client/.env.local${NC}"
        ((WARNINGS++))
    fi
    
    # Check USDC address
    if grep -q "VITE_USDC_ADDRESS_BASE_SEPOLIA" ../client/.env.local; then
        USDC_ADDR=$(grep "VITE_USDC_ADDRESS_BASE_SEPOLIA" ../client/.env.local | cut -d '=' -f2 | tr -d ' "')
        if [ -n "$USDC_ADDR" ]; then
            echo -e "${GREEN}✅ VITE_USDC_ADDRESS_BASE_SEPOLIA is set${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  VITE_USDC_ADDRESS_BASE_SEPOLIA not found${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ client/.env.local not found${NC}"
    ((ERRORS++))
fi

# Check contracts .env
echo -e "\n${BLUE}📋 Contract Deployment Configuration${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ contracts/.env exists${NC}"
    
    # Check deployer key
    if grep -q "DEPLOYER_PRIVATE_KEY" .env; then
        KEY=$(grep "DEPLOYER_PRIVATE_KEY" .env | cut -d '=' -f2 | tr -d ' "')
        if [ -z "$KEY" ] || [ "$KEY" == "your_deployer_private_key_here" ]; then
            echo -e "${RED}❌ DEPLOYER_PRIVATE_KEY is not set or has placeholder value${NC}"
            ((ERRORS++))
        else
            echo -e "${GREEN}✅ DEPLOYER_PRIVATE_KEY is set${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  DEPLOYER_PRIVATE_KEY not found${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  contracts/.env not found (needed for deployment)${NC}"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Configuration is valid.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Configuration has ${WARNINGS} warning(s) but no errors${NC}"
    exit 0
else
    echo -e "${RED}❌ Configuration has ${ERRORS} error(s) and ${WARNINGS} warning(s)${NC}"
    exit 1
fi

