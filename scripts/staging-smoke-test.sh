#!/usr/bin/env bash
# Staging smoke test: hit staging backend /health (and optional /health/deep) to verify env and basic reachability.
# Run before promoting staging -> main. Usage: ./scripts/staging-smoke-test.sh
# Override URL: STAGING_API_URL=https://fanclubz-backend-staging.onrender.com ./scripts/staging-smoke-test.sh

set -e

STAGING_API_URL="${STAGING_API_URL:-https://fanclubz-backend-staging.onrender.com}"
FAIL=0

echo "Staging smoke test → $STAGING_API_URL"
echo ""

# 1. /health must return 200 and env: staging
echo -n "  GET /health ... "
HTTP=$(curl -s -o /tmp/staging-health.json -w "%{http_code}" --connect-timeout 15 "$STAGING_API_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP" != "200" ]; then
  echo "FAIL (HTTP $HTTP)"
  FAIL=1
else
  ENV=$(grep -o '"env"[[:space:]]*:[[:space:]]*"[^"]*"' /tmp/staging-health.json 2>/dev/null || true)
  if echo "$ENV" | grep -q '"staging"'; then
    echo "OK (env=staging)"
  else
    echo "FAIL (expected env=staging, got: $ENV)"
    FAIL=1
  fi
fi

# 2. Optional: GET /api/v2/predictions (public list) - expect 200 or 500 (500 = schema/DB issue, still proves backend is up)
echo -n "  GET /api/v2/predictions (public) ... "
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 15 "$STAGING_API_URL/api/v2/predictions?limit=1" 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ] || [ "$HTTP" = "500" ]; then
  echo "OK (HTTP $HTTP)"
else
  echo "WARN (HTTP $HTTP)"
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo "Smoke test passed."
  exit 0
else
  echo "Smoke test failed. Fix staging before promoting to main."
  exit 1
fi
