# FanClubZ – MVP End‑to‑End Overhaul (USD‑first, Mobile‑first)

**Status:** Ready for implementation  
**Scope:** Auth/session, navigation, discover, prediction card + detail, stake flow, create flow, profile, wallet (demo), routing, performance, persistence, content quality  
**MVP Constraint:** **USD is the only currency**.  
**IA Change:** Replace bottom‑nav **Create** with **Profile**; add **Discover‑only FAB** to start the create flow.

---

## 1) Product guardrails
- **Currency:** USD everywhere (wallet, stake, returns, fees). Use `$1,234.56` formatting.
- **Mobile‑first:** Thumb‑reach actions; compact cards; progressive disclosure.
- **Trust:** No citation artifacts; clear odds → returns; predictable states.
- **Real data:** Persisted predictions and wallet; no hardcoded copy in UI.

---

## 2) Information architecture
- **Bottom nav (4 items):** Discover · Bets · Profile · Wallet.
- **Discover FAB:** A floating "+" button in the bottom‑right of **Discover** only. Opens Create stepper.
- **Profile access:** Bottom‑nav **Profile** + top‑right avatar both route to the same Profile screen ("me").
- **Routing:** `/` (Discover), `/bets`, `/profile` (me), `/wallet`, `/prediction/:id`, `/create`.

---

## 3) Discover feed redesign (compact cards)
**Problem:** Cards are tall and nested; long body text and meta lines reduce scanability.

**Card spec (list view):**
- Title: 2 lines max, ellipsis.
- Context line: 1 line max, ellipsis. No citations. Optional.
- Options strip: "Yes" and "No" pills with **odds as multiplier** (e.g., 2.0x). Optional sublabel for implied probability.
- Meta bar: time left, predictors count, and a right‑aligned **Predict** button.
- Tap behavior: tapping the card opens **Detail**; tapping **Predict** opens the **Stake Sheet**.
- Target height: ~160–180 px on 390×844 viewport.

**Copy rules:**
- Keep titles user‑friendly and falsifiable. Avoid dates embedded in titles when a deadline exists.
- Strip any bracketed or residual citation tokens before rendering.

---

## 4) Prediction detail
- Stable route: `/prediction/:id`.
- Show: title, context paragraph, options with odds, totals (stake pool, participants), deadline, creator, and settlement method.
- Provide a back arrow to return to Discover.
- Skeleton loader for initial fetch; graceful not‑found for invalid IDs.

---

## 5) Stake (bet) sheet – USD clarity
- Quick amounts: `$1`, `$5`, `$10`, `$25` (configurable).
- Inputs: editable stake amount (USD), odds (x.x), **computed potential return in USD**.
- Button states: disabled if stake > balance; primary on valid stake.
- Error texts: concise (e.g., "Insufficient balance").
- Keyboard‑safe: sheet and CTA remain visible with the keyboard open.

**Math display:**
- `Stake: $25 · Odds: 2.0x → Potential return: $50`.

---

## 6) Create flow (via Discover FAB)
- Step 1 – Basics: Title (required, 2–120 chars), short context (0–140), category.
- Step 2 – Options: Default Yes/No. System can compute odds or accept manual, but keep UI simple.
- Step 3 – Settings: Entry deadline (datetime picker), **Settlement = Manual** for MVP, min/max stake (USD).
- Preview: Show a final summary before Publish.
- Publish: Persist to DB; navigate to new prediction detail.

---

## 7) Profile
- Route: `/profile` (current user). If paramized routes exist, redirect `me` to current user.
- Content: avatar/initials, handle, rank, totals (predictions, win rate, net P/L), achievements (optional), settings block, sign out.
- Loading: skeletons; error boundary with retry.

---

## 8) Wallet (Demo‑only)
- Label wallet clearly as **Demo Funds** during MVP.
- Actions: **Add Demo Funds** with chips `$10`, `$25`, `$50`, `$100`; **Reset Demo Balance**.
- Remove Withdraw for demo.
- Guardrails: balance cannot go below `$0`; stake button disabled when insufficient funds.

---

## 9) Data and persistence
- Use your existing backend (e.g., Supabase) for:
  - `predictions` (id, title, context, category, deadline, creator_id, settlement_method, created_at)
  - `options` (id, prediction_id, label, odds)
  - `stakes` (id, prediction_id, option_id, user_id, amount_usd, created_at)
  - `users` (id, handle, email, avatar_url, created_at)
  - `wallet_ledger` (id, user_id, delta_usd, reason, created_at)
- Compute aggregates via SQL views or RPCs (participants, pool, time remaining).
- Sanitize text on ingest; store `source_url` internally but never render raw citations.

---

## 10) Routing & state
- Exact match for `/prediction/:id`; never fall back to list.
- Fallback for invalid IDs: in‑app 404 with "Back to Discover" CTA.
- Preserve scroll position when returning from detail to list.

---

## 11) Performance & reliability
- Code‑split non‑critical routes (Create, Profile).
- Skeletons on Discover cards and Prediction detail.
- Lazy‑load images; set `loading="lazy"` and width/height to avoid CLS.
- Avoid blocking main thread with heavyweight libs on first paint.

---

## 12) Accessibility & affordances
- Minimum 44×44 pt tap targets for primary actions.
- Labels/ARIA for nav items, Predict button, and FAB.
- Focus outlines visible; sheet dismiss has an explicit close affordance.
- Color contrast AA for text on green headers and buttons.

---

## 13) Analytics events (MVP)
- `view_discover`
- `tap_card` (prediction_id)
- `open_stake_sheet` (prediction_id, option)
- `place_stake_success` (prediction_id, amount_usd, odds)
- `create_opened` (from_fab)
- `create_published` (prediction_id)
- `wallet_add_demo`

---

## 14) QA acceptance checklist
- Currency is USD everywhere; no other symbols present.
- Card height within spec; long copy truncated; **Predict** visible without scroll.
- Card tap → detail works 100% for valid IDs; invalid IDs show friendly 404.
- Stake sheet shows Stake, Odds, Potential return in USD; disabled on insufficient balance.
- FAB appears on Discover only; Create tab removed; Profile tab added.
- Wallet cannot go negative; Withdraw hidden; Reset works.
- No citation artifacts in any screen.
- Skeletons visible during loading; no infinite spinners.

---

## 15) Open questions
- Should odds be set manually in MVP or computed from pooled stakes (AMM/parimutuel)?
- Do we need a basic report of a user’s recent stakes under Profile for transparency?

---

## 16) Rollout plan
- Week 1: IA + routing, remove Create tab, add Profile tab + FAB; compact cards; USD sweep.
- Week 2: Stake sheet math + wallet guardrails; create stepper with preview.
- Week 3: Persistence wiring + aggregates; skeletons; error states; QA + instrumentation.

