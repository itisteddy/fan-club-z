# OG Badges & Referrals Setup Guide

Quick guide to enable OG Badges and Referral features.

## Environment Variables

### Client (.env)
```env
# Enable OG Badges feature
VITE_BADGES_OG_ENABLE=1

# Enable Referrals feature  
VITE_REFERRALS_ENABLE=1

# Required for referral links
VITE_FRONTEND_URL=https://app.fanclubz.app
```

### Server (.env)
```env
# Enable OG Badges
BADGES_OG_ENABLE=1
BADGES_OG_COUNTS=25,100,500

# Enable Referrals
REFERRAL_ENABLE=1
REFERRAL_MAX_SIGNUPS_PER_IP_DAY=10
REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY=5

# Admin key for badge/referral admin operations
ADMIN_API_KEY=your-secret-admin-key
```

## Database Migrations

Run migrations in order:

```bash
# Referral system
psql -f server/migrations/201_users_referrals.sql
psql -f server/migrations/202_referral_clicks.sql
psql -f server/migrations/203_referral_attributions.sql
psql -f server/migrations/204_auth_logins.sql
psql -f server/migrations/205_referral_stats_mv.sql
psql -f server/migrations/206_referral_stats_mv_v2.sql

# Badge system
psql -f server/migrations/301_badges_og.sql
psql -f server/migrations/302_badges_admin_views.sql
psql -f server/migrations/303_badges_member_numbers.sql
```

Or via the migration runner:
```bash
cd server && npm run migrate
```

## OG Badge Backfill

After migrations, run the backfill to assign badges to earliest users:

```bash
# Via API (requires ADMIN_API_KEY)
curl -X POST https://your-api.com/api/badges/og/backfill \
  -H "Authorization: your-secret-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"goldCount": 25, "silverCount": 100, "bronzeCount": 500}'
```

Or manually:
```sql
-- Assign gold to first 25 verified users
SELECT * FROM backfill_og_badges(25, 100, 500, 'backfill:created_at');

-- Then backfill member numbers
SELECT * FROM backfill_og_badge_member_numbers();
```

## Referral Stats Refresh

The referral leaderboard uses a materialized view. Refresh it periodically:

```sql
-- Manual refresh
SELECT refresh_referral_stats();
```

Or set up a cron job:
```bash
# Every 15 minutes
*/15 * * * * psql -c "SELECT refresh_referral_stats();"
```

## Verification

### Check Badges
```bash
curl https://your-api.com/api/badges/og/summary \
  -H "Authorization: your-secret-admin-key"
```

### Check Referrals
```bash
curl https://your-api.com/api/leaderboard/referrals
```

## Feature Flags

Both features are fully gated by environment variables:

- Set `VITE_BADGES_OG_ENABLE=0` to hide all badge UI
- Set `VITE_REFERRALS_ENABLE=0` to hide all referral UI
- Server routes return 404 when features are disabled

## Components

### Badges
- `<OGBadge tier="gold" />` - Basic badge icon
- `<OGBadgeEnhanced tier="gold" showTooltip />` - Badge with rich tooltip
- `<OGBadgeInline tier="gold" />` - Inline badge for text contexts
- `<ProfileBadgesSection ogBadge="gold" />` - Profile section display

### Referrals
- `<ProfileReferralSection isOwnProfile />` - Profile referral section
- `<ReferralCard variant="full" />` - Standalone referral card
- `<ReferralShareModal isOpen onClose />` - Share modal
- `showReferralSuccessToast(name, avatar, count)` - Success toast

## User Journey

### New User via Referral
1. User clicks referral link `/r/code123`
2. Code stored in cookie (90 days)
3. User signs up
4. On first login, attribution created
5. Referrer notified (if implemented)
6. Both appear in referral leaderboard

### Badge Display
1. Badges appear on Profile page
2. Badges appear next to usernames in leaderboard
3. Badges appear in comment author chips
4. Hover shows tier info and member number

---

*Last updated: November 2024*
