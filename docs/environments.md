# Fan Club Z Environments

## Overview

| Env       | Frontend                         | Backend                          | Supabase         | Use Case                      |
|-----------|----------------------------------|----------------------------------|------------------|-------------------------------|
| **local** | localhost:5174                   | localhost:3001                   | staging or prod* | Dev on your machine           |
| **staging** | Vercel preview / staging.fanclubz.app | Render staging service       | Staging project  | Pre-prod testing              |
| **production** | app.fanclubz.app             | fan-club-z.onrender.com          | Production project | Live users                  |

* Local dev can point at staging Supabase for auth/data without running a local backend (see pnpm dev:staging).

---

## Environment Variables by Layer

### Frontend (VITE_* - baked at build time)

| Variable | Required | Description |
|----------|----------|-------------|
| VITE_SUPABASE_URL | Yes | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Yes | Supabase anon/public key |
| VITE_API_BASE_URL | No* | API base URL. If unset, auto-detected by hostname. |
| VITE_FRONTEND_URL | No | Canonical app URL for share links. |
| VITE_APP_ENV | No | local | staging | production - informational. |

* Required for pnpm dev:staging to point local frontend at staging backend.

### Backend (server only - never exposed to client)

| Variable | Required | Description |
|----------|----------|-------------|
| APP_ENV | No | local | staging | production. Default: NODE_ENV. |
| CORS_ALLOWLIST | No | Comma-separated list of allowed origins. |
| VITE_SUPABASE_URL | Yes | Same Supabase project URL as frontend. |
| VITE_SUPABASE_ANON_KEY | Yes | Same anon key as frontend. |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Supabase service role key (server-side only). |
| JWT_SECRET | Yes (prod) | JWT signing secret (min 32 chars in prod). |

---

## Scripts

| Script | Description |
|--------|-------------|
| pnpm dev | Start server + client. Uses .env.local. |
| pnpm dev:staging | Start client only, pointing at staging backend + staging Supabase. |
| pnpm dev:prod | Start client only, pointing at production backend. |

---

## File Layout

- .env.example - Root template (committed).
- .env.staging.example - Staging variable names only (committed).
- .env.production.example - Production variable names only (committed).
- .env.local - Local overrides (gitignored).
