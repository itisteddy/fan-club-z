# Staging Analytics Access & Data Population

## 1. Exact Staging Access Steps

### AdminGate flow

1. **Admin key** (required to pass the gate):
   - Stored in `localStorage` under key `fcz_admin_key`
   - Enter the staging `ADMIN_API_KEY` when prompted
   - Source: staging backend env `ADMIN_API_KEY` (same value used by `scripts/staging-analytics-smoke.sh`)

2. **Admin user session** (required for API calls):
   - Must be signed in with a user that is admin (`users.is_admin` or in `ADMIN_USER_IDS`)
   - Backend `requireAdmin` accepts either:
     - `x-admin-key` header matching `ADMIN_API_KEY`, or
     - `actorId`/`userId` in query + admin check

3. **Success path**:
   - Enter admin key → pass AdminGate → see AdminLayout
   - If not signed in: dashboard shows "Loading session..." until auth hydrates
   - Sign in with an admin user (Google OAuth on staging)
   - Navigate to Analytics → Overview tab

### Steps in order

1. Go to https://fanclubz-staging.vercel.app/admin/analytics
2. Enter admin key (staging `ADMIN_API_KEY`) when prompted
3. Sign in with Google if not already (admin user)
4. Analytics dashboard loads with Overview tab

---

## 2. Back to App Domain Fix

**Config/env causing wrong domain:** `FRONTEND_URL` from `VITE_FRONTEND_URL`

- **AdminLayout** uses: `appUrl = FRONTEND_URL || 'https://app.fanclubz.app'`
- **Source:** `client/src/utils/environment.ts` → `envClient.VITE_FRONTEND_URL`
- **Staging:** If `VITE_FRONTEND_URL` is unset or set to prod, Back to App points to `https://app.fanclubz.app`

**Fix applied:** Runtime detection in AdminLayout — when `hostname.includes('staging')`, use `window.location.origin` so Back to App stays on staging.

**Vercel env (optional):** Set `VITE_FRONTEND_URL=https://fanclubz-staging.vercel.app` for staging builds. The code fix ensures correct behavior even without it.

---

## 3. Empty-State Styling

**Fix applied:** Empty states use higher-contrast text:
- Primary: `text-slate-200 font-medium`
- Secondary: `text-slate-400 text-sm`
- Icons: `text-slate-500` (was `text-slate-600`)

Tabs with improved empty states: Overview, Growth, Referral, Engagement, Ops.

---

## 4. Backfill Trigger (Ops / Overview)

**Location:** Admin Analytics Dashboard header (all tabs)
- **Button:** "Backfill 90d" next to Presets
- **Click path:** Analytics → any tab → click "Backfill 90d" in header
- **Result:** POST to `/api/v2/admin/analytics/backfill` with last 90 days; banner shows "Backfill complete: N days processed"
- **Effect:** Populates `analytics_daily_snapshots` for Overview, Growth, Engagement, Ops

**Team Referrals backfill:** Separate — on `/admin/analytics/team`, click "Recompute (90d)" to backfill `referral_daily_snapshots` (migration 347).

---

## 5. Tab Data Sources

| Tab        | Data source                    | Populates after backfill? | Requires staging activity? |
|-----------|---------------------------------|---------------------------|----------------------------|
| Overview  | `analytics_daily_snapshots`     | Yes                      | No                         |
| Growth    | `analytics_daily_snapshots`     | Yes                      | No                         |
| Referral  | `v_team_referral_scorecard`     | Team backfill            | No (backfill from migration 347) |
| Engagement| `analytics_daily_snapshots`     | Yes                      | No                         |
| Ops       | snapshots + predictions + product_events | Yes (partial) | Partially (claim/event data from activity) |

**Fastest way to populate analytics in staging:**

1. Run **Backfill 90d** on Analytics dashboard (Overview tab) → fills Overview, Growth, Engagement, Ops
2. Go to **Team Referrals** → click **Recompute (90d)** → fills Referral tab
3. Ops tab: Data freshness, prediction health, economy come from backfill; claim/event throughput may stay low until there is real activity
