#!/usr/bin/env bash
# Run seed-staging-from-production. Loads .env from repo root for PRODUCTION_DATABASE_URL or DATABASE_URL.
# Set STAGING_DATABASE_URL if not in .env.
# Usage: ./scripts/run-seed-staging.sh
#    or: PRODUCTION_DATABASE_URL='postgresql://...' STAGING_DATABASE_URL='postgresql://...' ./scripts/run-seed-staging.sh

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
if [ -f .env ]; then set -a; . ./.env; set +a; fi
cd server
exec npm run db:seed-staging-from-production
