#!/bin/bash

echo "🔍 Verifying Server Environment Setup"
echo "====================================="
echo ""

if [ ! -f "server/.env" ]; then
    echo "❌ server/.env file not found!"
    echo ""
    echo "Please create it and add the variables from SERVER_ENV_SETUP.md"
    exit 1
fi

echo "✅ server/.env file exists"
echo ""

# Check each required variable
check_var() {
    local var=$1
    local required=$2
    
    if grep -q "^${var}=" server/.env; then
        value=$(grep "^${var}=" server/.env | cut -d'=' -f2)
        if [ -z "$value" ] || [ "$value" = "your_supabase_url" ] || [ "$value" = "your_supabase_key" ]; then
            echo "⚠️  $var is set but needs a real value"
            return 1
        else
            echo "✅ $var is configured"
            return 0
        fi
    else
        if [ "$required" = "true" ]; then
            echo "❌ $var is MISSING (required)"
            return 1
        else
            echo "⚠️  $var is not set (optional)"
            return 0
        fi
    fi
}

# Required variables
echo "Required Variables:"
echo "-------------------"
check_var "PAYMENTS_ENABLE" "true"
check_var "ENABLE_BASE_DEPOSITS" "true"
check_var "CHAIN_ID" "true"
check_var "RPC_URL" "true"
check_var "USDC_ADDRESS" "true"
check_var "RUNTIME_ENV" "true"
check_var "SUPABASE_URL" "true"
check_var "SUPABASE_ANON_KEY" "true"

echo ""
echo "Optional Variables:"
echo "-------------------"
check_var "BASE_DEPOSITS_MOCK" "false"
check_var "RPC_WS_URL" "false"

echo ""
echo "Quick Values Check:"
echo "-------------------"
grep -E "^(PAYMENTS_ENABLE|ENABLE_BASE_DEPOSITS|CHAIN_ID|USDC_ADDRESS|RUNTIME_ENV)=" server/.env | while read line; do
    echo "  $line"
done

echo ""
echo "Expected Values:"
echo "  PAYMENTS_ENABLE=1"
echo "  ENABLE_BASE_DEPOSITS=1"
echo "  CHAIN_ID=84532"
echo "  USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115"
echo "  RUNTIME_ENV=qa"
echo ""

# Count missing
missing=$(grep -c "❌" <(check_var "PAYMENTS_ENABLE" "true" && check_var "ENABLE_BASE_DEPOSITS" "true" && check_var "CHAIN_ID" "true" && check_var "RPC_URL" "true" && check_var "USDC_ADDRESS" "true" && check_var "RUNTIME_ENV" "true" && check_var "SUPABASE_URL" "true" && check_var "SUPABASE_ANON_KEY" "true") 2>/dev/null || echo "0")

if [ "$missing" = "0" ]; then
    echo "🎉 Environment looks good! You can start the server."
    echo ""
    echo "Run: cd server && npx tsx src/index.ts"
else
    echo "⚠️  Please fix the missing variables before starting the server."
    echo ""
    echo "See SERVER_ENV_SETUP.md for details."
fi

