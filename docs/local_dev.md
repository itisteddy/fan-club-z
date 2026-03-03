# Local Development

## Quick Start

### Option 1: Full local (server + client)
pnpm dev

Uses .env.local. Frontend hits http://localhost:3001.

### Option 2: Local frontend → staging backend (recommended for UI work)
pnpm dev:staging

Frontend runs locally; API calls go to staging backend. Auth uses staging Supabase.

Required: .env.staging with VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.

### Option 3: Local frontend → production backend
pnpm dev:prod

Use sparingly; avoid changing prod data.

## Common Errors
- CORS blocked: Add localhost to CORS_ALLOWLIST on backend.
- Auth redirects to prod: Add localhost to Supabase redirect URLs.
- Loads no data: Ensure VITE_API_BASE_URL points to correct backend.
