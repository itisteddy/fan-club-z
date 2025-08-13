# Fanclubz — Settlement & Outcome Acceptance UX (v1.0)

## 0) Context & Goals

**Why:** Settlement is where trust is won or lost. We need a flow that’s clear before, automatic when possible, auditable after, and socially resilient (players can accept/contest outcomes).

**What’s new vs v0.9 draft:** Adds a Player Outcome Acceptance step, tighter proof mechanics, admin tools, analytics, and edge‑case rules. Also defines data contracts and API surface.

---

## 1) Purpose

Ship a settlement system that’s clear before betting, automatic when possible, auditable after, and simple for creators, players, and reviewers.

## 2) Success Criteria

- Players can read “How we’ll settle this” in ≤10s (measured via dwell).
- 95% of markets settle within 2 hours of result availability.
- Dispute rate <1%, avg dispute resolution <24h.
- Every settlement has proof (source + timestamp + cached snapshot + hash).
- ≥85% of participants tap Accept within 12h; the rest auto‑accept at 24h unless disputed.

## 3) Core User Stories

- **Creator:** Choose an official source and generate a plain‑language rule.
- **Player:** Check the rule, source, lock time, and reliability stats before staking.
- **Reviewer/Admin:** Fetch the source, attach proof, settle/void, and log a clear audit trail.
- **All:** View proof and timeline after settlement.
- **New — Player Acceptance:** Accept or Dispute outcome within a set window.

---

## 4) End‑to‑End Flows

**A) Create Bet → Step 2: Settlement (Creator)**

- Source Picker (search approved sources; add new with pending status)
- Outcome Template (category-aware)
- Close (Lock) Time with presets and timezone toggle
- Contingencies (postponed, source down)
- Live Rule Preview and Validation Chips
- **CTA:** Publish or Submit for review

**B) Player Bet Card (pre‑stake)**

- Shows: title, category, countdown, odds, creator badge
- Link: “How we’ll settle this” modal (rule, sources, lock time, past reliability)

**C) Lifecycle States & UI**

- OPEN → LOCKED → SETTLING → SETTLED (plus VOIDED, DISPUTED → RESOLVED)
- Proof display during SETTLING/SETTLED

**D) Player Acceptance & Dispute (new)**

- Post‑settlement banner with Accept/Dispute buttons
- Accept = acknowledgement (payout not delayed)
- Dispute flow with reason, evidence

**E) Admin/Reviewer Console**

- Filters, detail view with live webview, proof capture, finalize actions

---

## 5) Reusable UI Components

SettlementBadge, RulePreview, SourcePill, TimezoneChip, AuditTimeline, ProofRow, AcceptanceBar, DisputeCard.

## 6) Microcopy

- “We settle using public, official sources—no rumors.”
- “All settlements include proof and timestamps.”
- “Outcome: YES. Review proof and Accept or Dispute within 24h.”

## 7) Edge Cases & Rules

- Ambiguous outcomes → Manual‑Checked + 2 sources
- Postponed >7 days → Auto‑void
- Source updated/moved → archived snapshot
- Sports stat corrections >24h later → no reopen

## 8) Data Contracts

**A) Create/Update Bet (Settlement section)**

```json
{
  "bet_id": "optional",
  "category": "sports|music|film|finance|pop",
  "title": "Will Davido release 'XYZ' by Aug 30, 2025?",
  "options": ["YES", "NO"],
  "region": "NG",
  "visibility": "public",
  "open_time": "2025-08-24T18:00:00+01:00",
  "close_time": "2025-08-30T23:59:00+01:00",
  "settlement": {
    "method": "api|web|oracle|manual",
    "primary_source": { "name": "Premier League", "url": "https://www.premierleague.com", "category": "sports" },
    "backup_source":  { "name": "ESPN", "url": "https://www.espn.com", "category": "sports" },
    "rule_text": "YES if Arsenal defeats Chelsea on Aug 24, 2025, per premierleague.com final score. If postponed → Auto-void.",
    "timezone": "Africa/Lagos",
    "contingencies": {
      "postponed": "auto_void|extend_lock|keep_open",
      "source_down": "use_backup|pause_and_escalate"
    },
    "risk_flags": [],
    "badges": ["Auto-Settled"]
  }
}
```

**B) Settlement Object**

```json
{
  "bet_id": "abc123",
  "state": "open|locked|settling|settled|voided|disputed|resolved",
  "outcome": "YES|NO|null",
  "settled_at": "2025-08-24T20:38:00Z",
  "proof": {
    "fetched_at": "2025-08-24T20:36:20Z",
    "source_url": "https://www.premierleague.com/match/12345",
    "screenshot_url": "https://cdn.fcz/proofs/abc123.png",
    "content_hash": "sha256:4f9a...",
    "parser_note": "Final: Arsenal 2–1 Chelsea"
  },
  "audit_log": [
    {"ts":"2025-08-24T19:30:00Z","actor":"system","event":"locked"},
    {"ts":"2025-08-24T20:36:20Z","actor":"oracle","event":"source_fetched"},
    {"ts":"2025-08-24T20:38:00Z","actor":"system","event":"settled","data":{"outcome":"YES"}}
  ],
  "acceptance": {
    "window_hours": 24,
    "stats": { "accepted": 188, "auto_accepted": 52, "disputed": 3 }
  }
}
```

**C) Dispute Object**

```json
{
  "bet_id": "abc123",
  "dispute_id": "dsp_001",
  "opened_by": "user_789",
  "opened_at": "2025-08-24T22:01:00Z",
  "reason": "source_updated|wrong_source|timing|other",
  "evidence": [
    {"type":"link","value":"https://www.bbc.com/..."},
    {"type":"image","value":"https://cdn.fcz/uploads/proof.png"}
  ],
  "state": "open|under_review|upheld|overturned",
  "resolution_note": "Official site shows same result; settlement upheld."
}
```

**D) Player Acceptance Record**

```json
{
  "bet_id": "abc123",
  "user_id": "u_456",
  "action": "accepted|auto_accepted|disputed",
  "timestamp": "2025-08-24T22:05:00Z"
}
```

---

## 9) API Surface (MVP)

- `POST /bets`
- `PATCH /bets/:id`
- `POST /bets/:id/settle`
- `GET /bets/:id/settlement`
- `POST /bets/:id/accept`
- `POST /bets/:id/disputes`
- `PATCH /bets/:id/disputes/:dispute_id`
- `GET /bets/:id/audit`

---

## 10) Screens to Wireframe

- Create Bet → Settlement
- Bet Card → “How we’ll settle this” modal
- Bet Detail with Proof panel
- Acceptance Bar with countdown
- Dispute modal + timeline
- Admin Console

## 11) Frontend Validation Rules

- Disable Publish until all settlement fields complete
- Pending new sources → review only
- Timezone badge always visible
- Only participants can dispute

## 12) Analytics (events)

- `settlement_rule_viewed`
- `bet_published_with_pending_source`
- `market_state_changed`
- `settlement_proof_viewed`
- `accept_clicked` | `accept_auto` | `dispute_opened` | `dispute_resolved`
- `admin_settlement_overridden`

## 13) Notifications

- Lock reminder
- Settled alert with Accept/Dispute
- Dispute updates
- Admin digests

## 14) Accessibility & Performance

- Modals keyboard‑navigable
- Alt text for proof
- Lazy‑load proof images

## 15) Security & Integrity

- Hash proofs server‑side
- Signed URLs for proof
- Rate‑limit disputes
- Admin 2FA

## 16) Engagement Levers

- Pride, FOMO, loops, visuals, debate, rewards, ease

## 17) QA Test Scenarios

- Publish with approved vs pending source
- Auto vs manual proof
- Acceptance vs auto‑accept
- Dispute flows
- Postponed auto‑void
- Source updated edge case
- Timezone correctness

## 18) Rollout Plan

- **Phase 1:** Manual‑Checked only
- **Phase 2:** Enable Auto‑Settled for low‑risk; player Acceptance on
- **Phase 3:** Open dispute visibility; reputation & XP hooks

