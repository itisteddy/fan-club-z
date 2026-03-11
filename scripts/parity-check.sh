#!/usr/bin/env bash
# Parity gate: compare prod vs staging. Exit non-zero on FAIL.
# Usage: ./scripts/parity-check.sh  or  pnpm run parity-check

set -e
cd "$(dirname "$0")/.."
exec node scripts/parity-check.mjs "$@"
