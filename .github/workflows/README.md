# CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows

### `ci.yml` - Continuous Integration
Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- **Install & Verify**: Installs dependencies and verifies environment setup
- **Type Check**: Runs TypeScript type checking for client and server
- **Lint**: Runs ESLint for code quality checks
- **Build**: Builds both client and server, uploads artifacts
- **Unit Tests**: Runs unit tests
- **API Tests**: Runs API integration tests (requires PostgreSQL service)
- **Smoke Tests**: Runs minimal test subset for quick validation
- **Ledger Check**: Runs ledger sanity checks (main branch only)

### `cd.yml` - Continuous Deployment
Runs on pushes to `main` branch and version tags.

**Jobs:**
- **Build & Test**: Full build and test before deployment
- **Deploy Frontend**: Deploys client to Vercel
- **Deploy Backend**: Triggers Render deployment (or uploads artifacts)
- **Health Check**: Verifies deployments are healthy
- **Post-Deploy Ledger Check**: Runs ledger sanity check after deployment

### `pr-checks.yml` - Pull Request Checks
Runs on pull requests to `main` and `develop`.

**Jobs:**
- Quick type check, lint, build verification, and smoke tests

### `nightly.yml` - Nightly Maintenance
Runs daily at 2 AM UTC.

**Jobs:**
- **Ledger Check**: Nightly ledger sanity check
- **Health Check**: Checks all environment health endpoints

## Required Secrets

Configure these secrets in GitHub repository settings:

### Required for CI/CD:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_URL` - Supabase project URL (server)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `DATABASE_URL` - PostgreSQL connection string

### Required for Deployment:
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Optional (for full builds):
- `VITE_CHAIN_ID` - Chain ID (default: 84532)
- `VITE_RPC_URL` - RPC URL for Base Sepolia
- `VITE_USDC_ADDRESS` - USDC contract address
- `VITE_BASE_ESCROW_ADDRESS` - Escrow contract address
- `VITE_WC_PROJECT_ID` - WalletConnect project ID

## Artifacts

Build artifacts are uploaded and retained:
- **Client build**: `client/dist` (7 days for CI, 30 days for CD)
- **Server build**: `server/dist` (7 days for CI, 30 days for CD)

## Cache

Node modules are cached using GitHub Actions cache for faster builds.

## Environment Variables

Some workflows use dummy values for builds when secrets aren't available. Production deployments require all secrets to be configured.

## Troubleshooting

### Build Failures
1. Check Node.js version compatibility (>=20.0.0)
2. Verify all dependencies install correctly
3. Check for TypeScript errors
4. Review linting errors

### Deployment Failures
1. Verify all required secrets are set
2. Check Vercel/Render deployment logs
3. Verify health endpoints are accessible
4. Review ledger check results

### Test Failures
1. Check test environment setup
2. Verify database connection (for API tests)
3. Review test logs for specific failures

## Manual Triggers

Some workflows can be manually triggered:
- `cd.yml` - Can be triggered with environment selection
- `nightly.yml` - Can be manually triggered for immediate checks

