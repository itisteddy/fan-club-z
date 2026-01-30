#!/bin/bash
# Redeploy Render service
# Usage: RENDER_API_KEY=your_key ./scripts/redeploy-render.sh

set -e

RENDER_API_KEY="${RENDER_API_KEY:-}"
SERVICE_ID="${RENDER_SERVICE_ID:-srv-d25vcd6uk2gs73b8qdgg}"  # fan-club-z service ID

if [ -z "$RENDER_API_KEY" ]; then
  echo "❌ RENDER_API_KEY environment variable is required"
  echo "   Get it from: https://dashboard.render.com/account/api-keys"
  exit 1
fi

echo "🚀 Triggering Render redeploy for service ${SERVICE_ID}..."

# Render API: Create a manual deploy
RESPONSE=$(curl -s -X POST \
  "https://api.render.com/v1/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": "do_not_clear"}')

if echo "$RESPONSE" | grep -q '"id"'; then
  DEPLOY_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Deployment triggered: ${DEPLOY_ID}"
  echo "   Monitor at: https://dashboard.render.com/web/${SERVICE_ID}"
else
  echo "❌ Failed to trigger deployment:"
  echo "$RESPONSE"
  exit 1
fi
