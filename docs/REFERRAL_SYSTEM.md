# Referral System Implementation Guide

## Overview

The FanClubZ referral system allows users to invite friends via unique referral links. When a referred user signs in for the first time, the referral is attributed to the referrer. Active referrals (users who have logged in) are tracked and displayed on a dedicated leaderboard tab.

## Feature Flags

### Client (Vite)
```env
VITE_REFERRALS_ENABLE=1
```

### Server (Express)
```env
REFERRAL_ENABLE=1
REFERRAL_MAX_SIGNUPS_PER_IP_DAY=10
REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY=5
```

## Database Schema

### Users Table Extensions
```sql
ALTER TABLE users 
  ADD COLUMN referral_code text UNIQUE,
  ADD COLUMN referred_by uuid REFERENCES users(id),
  ADD COLUMN first_login_at timestamptz,
  ADD COLUMN last_login_at timestamptz;
```

### Supporting Tables
- `referral_clicks` - Tracks clicks on referral links
- `referral_attributions` - Records successful referral attributions
- `auth_logins` - Logs user login events
- `referral_stats_mv` - Materialized view for fast leaderboard queries

## Architecture

### Link Flow
1. User A shares their referral link: `https://app.fanclubz.app/r/{code}`
2. User B clicks the link
3. Server logs the click and sets a cookie with the referral code
4. User B is redirected to the app
5. When User B signs in (first time), the referral is attributed to User A
6. Both users' stats are updated

### API Endpoints

#### Referral Link Handling
- `GET /r/:code` - Handles referral link clicks (logs click, sets cookie, redirects)

#### Attribution & Tracking
- `POST /api/referrals/attribute` - Attribute a referral on first sign-in
- `POST /api/referrals/log-login` - Log user logins for active tracking
- `GET /api/referrals/my-stats` - Get current user's referral statistics

#### Leaderboard
- `GET /api/leaderboard/referrals` - Get referral leaderboard (sorted by active referrals)

#### Admin
- `POST /api/admin/referrals/refresh-stats` - Refresh the materialized view (requires admin key)

## Client Components

### Hooks
- `useReferral()` - Current user's referral state and actions
- `useReferralLeaderboard()` - Leaderboard data with loading/error states
- `useReferralCapture()` - Captures referral codes from URLs on app load
- `useReferralAttribution()` - Handles attribution on first login

### UI Components
- `ReferralCard` - Displays referral link with copy/share functionality
- `ReferralShareModal` - Full-screen share modal with social options

### Integration Points
- **Profile Page**: Shows ReferralCard for authenticated users
- **Leaderboard**: "Top Referrers" tab (when feature enabled)
- **Router**: `/r/:code` route for capturing referral links

## Anti-Abuse Measures

1. **Self-referral prevention**: Users cannot refer themselves
2. **Device fingerprint limits**: Max N attributions per device per day
3. **IP limits**: Max M signups per IP per day
4. **Suspicious flags**: Recorded in attribution metadata for review

## Testing

1. Enable feature flags in both client and server .env
2. Create a test user and note their referral code
3. Open referral link in incognito browser
4. Sign up as new user
5. Verify attribution appears in database
6. Check leaderboard reflects the new referral

## Running Migrations

```bash
# From server directory
pnpm run migrate

# Or manually apply:
psql $DATABASE_URL -f migrations/201_users_referrals.sql
psql $DATABASE_URL -f migrations/202_referral_clicks.sql
psql $DATABASE_URL -f migrations/203_referral_attributions.sql
psql $DATABASE_URL -f migrations/204_auth_logins.sql
psql $DATABASE_URL -f migrations/205_referral_stats_mv.sql
```

## Refreshing Stats

The materialized view should be refreshed periodically for accurate leaderboard:

```sql
SELECT refresh_referral_stats();
```

Or via API:
```bash
curl -X POST https://api.fanclubz.app/api/admin/referrals/refresh-stats \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```
