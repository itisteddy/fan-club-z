#!/bin/bash

# Add ENABLE_BETS flags to server/.env

ENV_FILE="server/.env"

echo "Adding ENABLE_BETS flags to $ENV_FILE..."

# Check if flags already exist
if grep -q "ENABLE_BETS" "$ENV_FILE" 2>/dev/null; then
    echo "⚠️  ENABLE_BETS already exists in $ENV_FILE"
    echo "Current value:"
    grep "ENABLE_BETS" "$ENV_FILE"
else
    # Add the flags
    echo "" >> "$ENV_FILE"
    echo "# Enable bet placement" >> "$ENV_FILE"
    echo "ENABLE_BETS=1" >> "$ENV_FILE"
    echo "ENABLE_BASE_BETS=1" >> "$ENV_FILE"
    echo "✅ Added ENABLE_BETS flags to $ENV_FILE"
fi

echo ""
echo "Current betting flags in $ENV_FILE:"
grep -E "ENABLE.*BETS|BASE.*BETS" "$ENV_FILE" 2>/dev/null || echo "No betting flags found"

echo ""
echo "Next step: Restart the server"
echo "  cd server && npm run dev"

