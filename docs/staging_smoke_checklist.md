# Staging Smoke Checklist

**Order:** Execute in this exact sequence.

---

1. [ ] **Signup** — New user via OAuth; session created
2. [ ] **Login** — Existing user login; session hydration
3. [ ] **Referral attribution** — New user via `?ref=CODE`; attribution recorded
4. [ ] **Prediction creation** — Create prediction (crypto/fiat as applicable)
5. [ ] **Stake placement** — Place stake; amount, odds, wallet/zaurum debit correct
6. [ ] **Settlement** — Creator settles prediction (manual/merkle)
7. [ ] **Claim** — User claims winnings
8. [ ] **Wallet / Zaurum flow** — Balance, buckets, transfers
9. [ ] **Admin access** — Admin routes load; auth enforced
10. [ ] **/admin/analytics** — All 5 tabs load
11. [ ] **Backfill endpoint** — Admin backfill runs (or returns expected response)
12. [ ] **CSV export** — Export downloads; data sane
13. [ ] **Team / referral scorecards** — Leaderboard and individual scorecard
14. [ ] **Ops freshness / cron health** — Snapshot + retention crons registered; no boot errors
