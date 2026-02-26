# Item 4 Public Profile Rollout Checklist

## Staging

1. Create two accounts (`A` and `B`) with usernames/handles set.
2. From account `A`, open leaderboard and tap account `B` avatar/name.
3. Confirm deep link route loads:
   - preferred: `/u/:handle`
   - fallback links (if any): `/profile/:userId`
4. Confirm public profile renders same layout style as self profile, but **view-only**:
   - no edit pencil
   - no referral/share self-only actions
   - no sign out / account actions
5. Confirm Achievements section is visible on public profile.
6. Confirm no private fields are exposed in network response:
   - email
   - referral code
   - wallet address
   - admin flags
7. Open comments, tap commenter avatar/name, verify public profile opens.
8. Test unknown handle (`/u/not-a-real-user`) shows “Profile not found” state.

## Production

1. Deploy backend and frontend together.
2. Smoke test leaderboard and comments navigation to public profiles.
3. Inspect `/api/v2/users/:id/public-profile` response in DevTools for field projection safety.
4. Monitor backend logs for:
   - `/api/v2/users/resolve`
   - `/api/v2/users/:id/public-profile`
   - spike in 404 or 500 responses

