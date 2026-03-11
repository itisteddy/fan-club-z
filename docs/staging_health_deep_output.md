# Staging /health/deep Output (Sanitized)

Captured after redeploy. Use to diagnose 500s: if DB connect fails → fix DATABASE_URL; if tables missing → apply migrations; if CORS mismatch → update allowlist.

**No ad-hoc fixes until /health/deep is green.**

## Latest (2026-03-11)

**GET https://fanclubz-backend-staging.onrender.com/health/deep**

```json
{
  "ok": true,
  "env": "staging",
  "gitSha": "87ffbb001bc7a24da35b50d53b1494fd3b710b03",
  "db": { "ok": true, "error": null },
  "checks": [
    { "name": "table:users", "ok": true, "error": null },
    { "name": "table:wallets", "ok": true, "error": null },
    { "name": "table:wallet_transactions", "ok": true, "error": null },
    { "name": "table:predictions", "ok": true, "error": null },
    { "name": "table:prediction_options", "ok": true, "error": null },
    { "name": "table:prediction_entries", "ok": true, "error": null },
    { "name": "table:comments", "ok": true, "error": null },
    { "name": "table:categories", "ok": true, "error": null },
    { "name": "table:bet_settlements", "ok": true, "error": null },
    { "name": "table:user_awards_current", "ok": true, "error": null },
    { "name": "table:badge_definitions", "ok": true, "error": null }
  ],
  "time": "2026-03-11T22:33:46.260Z"
}
```

**Status:** Green. All checks pass.

### Next debugging step (if other endpoints return 500)

**No ad-hoc fixes until /health/deep is green.** Since /health/deep is green, DB and schema are OK.

If staging returns 500s on other endpoints:
- **Auth/JWT:** Check SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, auth redirect URLs
- **Route-specific logic:** Inspect server logs for the failing route
- **CORS:** Ensure staging frontend origin is in CORS_ALLOWLIST
