# Stable Version Records

**Last Updated:** January 2025  
**Purpose:** Track stable production states for both main app and landing page

---

## Main App Stable Versions

### Latest Stable: `fcz-stable-main-app-20251128-*`

**Commit:** `eeb25b23`  
**Date:** January 28, 2025  
**Branch:** `recovery/fcz-stable-main-app-*`

**Key Features:**
- Funding guide moved to landing site (external link)
- Wallet pages link to `https://fanclubz.app/docs/funding-guide`
- Removed funding guide route from main app
- All wallet functionality working correctly

**Deployment:**
- **Project:** `fan-club-z`
- **Domain:** `app.fanclubz.app`
- **Status:** Production ready

**Recovery:**
```bash
git checkout fcz-stable-main-app-20251128-*
# Or
git checkout recovery/fcz-stable-main-app-20251128-*
```

---

## Landing Page Stable Versions

### Latest Stable: `fcz-stable-landing-page-20251128-*`

**Commit:** `eeb25b23`  
**Date:** January 28, 2025  
**Tag:** `fcz-stable-landing-page-*`

**Key Features:**
- Multi-page landing site with `LandingRouter`
- Funding guide at `/docs/funding-guide` (dark theme)
- Updated tagline: "Turn your opinions into rewards"
- FAQ and footer links to funding guide
- Internal React Router navigation

**Deployment:**
- **Project:** `landing-page`
- **Domain:** `fanclubz.app`
- **Status:** Production ready

**Recovery:**
```bash
git checkout fcz-stable-landing-page-20251128-*
```

---

## Previous Stable Versions

### Settlement Fixes Stable: `fcz-stable-production-20251128-130124`

**Commit:** `0f57f78f`  
**Date:** January 28, 2025  
**Tag:** `fcz-stable-production-20251128-130124`  
**Branch:** `recovery/fcz-stable-production-20251128-125917`

**Key Features:**
- Available balance fix (exclude settled predictions from escrow locks)
- Claimable deduplication fix
- On-chain settlement working
- Balance reconciliation fixes

**Settlement TX:** `0xcf1e6ccbedeb391dd07dce2f9fd86c7b00186e3f425664b205b7098104304652`

---

## Recovery Procedures

### Recover Main App to Stable

```bash
# Option 1: Checkout tag
git checkout fcz-stable-main-app-20251128-*

# Option 2: Checkout branch
git checkout recovery/fcz-stable-main-app-20251128-*

# Then deploy to Vercel
vercel link --yes --project=fan-club-z --scope=teddys-projects-d67ab22a
vercel --prod --yes
```

### Recover Landing Page to Stable

```bash
# Checkout tag
git checkout fcz-stable-landing-page-20251128-*

# Then deploy to Vercel
vercel link --yes --project=landing-page --scope=teddys-projects-d67ab22a
vercel --prod --yes
```

### Recover Both to Previous Settlement Stable

```bash
# Checkout previous stable
git checkout fcz-stable-production-20251128-130124

# Deploy main app
vercel link --yes --project=fan-club-z --scope=teddys-projects-d67ab22a
vercel --prod --yes

# Deploy landing page
vercel link --yes --project=landing-page --scope=teddys-projects-d67ab22a
vercel --prod --yes
```

---

## Version History

| Date | Tag | Commit | Description |
|------|-----|--------|-------------|
| 2025-01-28 | `fcz-stable-main-app-*` | `eeb25b23` | Funding guide moved to landing site |
| 2025-01-28 | `fcz-stable-landing-page-*` | `eeb25b23` | Multi-page landing site with funding guide |
| 2025-01-28 | `fcz-stable-production-*` | `0f57f78f` | Settlement fixes and balance reconciliation |

---

## Notes

- **Main app** and **landing page** are separate Vercel projects
- Both deploy from the same `main` branch but use different build configurations
- See `DEPLOYMENT_ARCHITECTURE.md` for detailed deployment procedures
- Always verify both projects after recovery
- Test both domains after deployment

---

**Maintained By:** Development Team  
**Related Docs:** `DEPLOYMENT_ARCHITECTURE.md`, `PRODUCTION_CHALLENGES_AND_SOLUTIONS.md`

