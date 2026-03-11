# Promotion Gate (Staging → Main)

**Do not merge staging to main until both gates pass.**

## Gate 1: Parity check

```bash
pnpm run parity-check
```

Must exit 0. Compares:
- gitSha (when both have /health)
- /health/deep: DB connectivity + required tables
- /debug/config: dbHost, supabaseHost, apiHost, corsAllowlistCount

Exit non-zero on FAIL.

## Gate 2: Staging smoke tests

```bash
./scripts/staging-smoke-test.sh
```

Or:

```bash
pnpm run staging-smoke-test
```

Must exit 0. Verifies staging backend /health returns 200 with env=staging.

## Promotion sequence

1. `pnpm run parity-check` → exit 0
2. `pnpm run staging-smoke-test` → exit 0
3. Only then: merge staging → main (see `docs/promotion_checklist.md`)
