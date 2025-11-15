#!/bin/bash
# TypeScript Error Analysis Script
# Run this to get detailed typecheck output for Claude to analyze

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="$PROJECT_ROOT/typecheck-results.txt"

echo "🔍 Running TypeScript type checking..."
echo "Project: FanClubZ version 2.0"
echo "Date: $(date)"
echo ""
echo "================================="
echo ""

# Run typecheck and capture output
{
  echo "=== CLIENT TYPECHECK ==="
  cd "$PROJECT_ROOT/client" && npm run typecheck 2>&1 | head -200
  echo ""
  echo "=== SERVER TYPECHECK ==="
  cd "$PROJECT_ROOT/server" && npm run typecheck 2>&1 | head -200
  echo ""
  echo "=== FULL TYPECHECK (from root) ==="
  cd "$PROJECT_ROOT" && npm run typecheck 2>&1
} | tee "$OUTPUT_FILE"

echo ""
echo "================================="
echo ""
echo "✅ Typecheck complete!"
echo "Output saved to: $OUTPUT_FILE"
echo ""

# Count errors
CLIENT_ERRORS=$(grep -c "error TS" "$OUTPUT_FILE" 2>/dev/null || echo "0")
echo "📊 Total TS errors found: $CLIENT_ERRORS"
echo ""
echo "🔎 Error Summary (top 10 patterns):"
grep "error TS" "$OUTPUT_FILE" 2>/dev/null | sed 's/.*error TS/error TS/' | cut -d':' -f1 | sort | uniq -c | sort -rn | head -10
echo ""
echo "📋 Next steps:"
echo "1. Review $OUTPUT_FILE"
echo "2. Share error count and samples with Claude"
echo "3. Identify any legacy/unused files with errors"
echo ""
