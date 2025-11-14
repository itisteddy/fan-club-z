#!/bin/bash

echo "🚀 Starting Deposit Watcher Server"
echo "=================================="
echo ""

# Check if server/.env exists
if [ ! -f "server/.env" ]; then
    echo "❌ Error: server/.env file not found!"
    echo ""
    echo "Please create server/.env with these variables:"
    echo ""
    cat SERVER_ENV_SETUP.md
    exit 1
fi

# Check for required variables
echo "📋 Checking environment variables..."

cd server

required_vars=(
    "PAYMENTS_ENABLE"
    "ENABLE_BASE_DEPOSITS"
    "CHAIN_ID"
    "RPC_URL"
    "USDC_ADDRESS"
    "RUNTIME_ENV"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
)

missing=()
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        missing+=("$var")
    fi
done

if [ ${#missing[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${missing[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo "Please add these to server/.env (see SERVER_ENV_SETUP.md)"
    exit 1
fi

echo "✅ All required variables present"
echo ""
echo "🔄 Starting server with deposit watcher..."
echo ""

# Start the server
npx tsx src/index.ts

