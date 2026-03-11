# Parity Runbook

How to run the parity script, interpret failures, and fix issues.

## 1. Run Parity Script

```bash
node scripts/parity-check.mjs
```

Or with custom URLs:

```bash
PROD_BACKEND_URL=https://fan-club-z.onrender.com \
STAGING_BACKEND_URL=https://fanclubz-backend-staging.onrender.com \
node scripts/parity-check.mjs
```

## 2. Interpret Failures

| Failure | Meaning | Next Action |
|---------|---------|-------------|
| `Prod /health: 5xx` | Prod backend down or error | Check Render prod logs |
| `Staging /health: 5xx` | Staging backend down | Check Render staging logs |
| `gitSha mismatch` | Staging and prod on different commits | Merge staging → main or deploy same commit to both |
| `Prod DB: not ok` | Prod DB unreachable | Check Supabase prod, DATABASE_URL |
| `Staging DB: not ok` | Staging DB unreachable | Check Supabase staging, DATABASE_URL |
| `Staging missing/broken tables` | Schema drift | Apply migrations to staging (see below) |

## 3. Next Actions

### Fix DB connectivity

- Verify `DATABASE_URL` or Supabase URL in Render env
- Ensure Supabase project is not paused

### Fix missing tables

1. Apply migrations to staging:

   ```bash
   export DATABASE_URL="postgresql://..."  # staging
   cd server && pnpm run db:migrate-all
   ```

2. If schema is badly drifted:

   - Create a new Supabase staging project
   - Apply migrations from scratch (see `docs/staging_setup_supabase.md`)

### Fix CORS

- Add staging frontend origin to `CORS_ALLOWLIST` in Render staging env
- Example: `https://fanclubz-staging.vercel.app`

### Fix gitSha mismatch

- Ensure staging branch is merged to main before promoting
- Or deploy the same commit to both (for parity testing)

## 4. Warnings

- **CORS allowlist count/sample differs**: Often expected (staging has different origins). Check if staging frontend can reach backend.
- **Socket origin**: Socket.IO uses the same CORS allowlist as HTTP (`getCorsOrigins()`). CORS mismatch implies socket origin mismatch.
- **Supabase host same**: Prod and staging should use different Supabase projects. If same, create a staging project.
