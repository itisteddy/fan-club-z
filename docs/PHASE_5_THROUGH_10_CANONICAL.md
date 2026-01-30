# Phases 5–10 — Canonical Definitions (from prompts)

This document is the single source of truth for Phase 5 through Phase 10 scope.

---

## Phase 5 — UGC Baseline
**Scope:** Terms acceptance + Contact info + Content filtering  
**Goal:** Mandatory acceptance of Terms/Privacy/Community Guidelines; published contact in-app; basic content filtering before posting UGC (predictions, comments, profile bio, option labels).  
**Evidence:** Users must accept before UGC; contact visible; objectionable text blocked server-side (+ optional client-side).

---

## Phase 6 — UGC Safety
**Scope:** Report + Block + Instant feed removal + Developer notifications + Moderation queue  
**Goal:** Report content, block user, instantly hide blocked user content, notify admin, admin moderation queue (list open reports, remove content, ban user, mark resolved).  
**Evidence:** Report/block flows work; blocker’s feed updates; admin notified and can act.

---

## Phase 7 — Disputes
**Scope:** End-to-end dispute flow  
**Goal:** User can file dispute after prediction settled; admin reviews; outcome updated or dispute closed; users see results; notify submitter on status change.  
**Evidence:** Dispute submit + status visible; admin resolve; no settlement regressions.

---

## Phase 8 — Odds + Payout
**Scope:** ODDS_V2 feature flag; clarify odds vs payout; expected return on stake  
**Goal:** Correct/unambiguous odds label; show “Expected payout” and “Profit”; microcopy explaining odds.  
**Evidence:** Stake, expected payout, profit visible; odds unambiguous; settlement unchanged unless explicitly changed.

---

## Phase 9 — Closed Predictions: Resolution reasoning + source
**Scope:** Resolution section on settled predictions  
**Goal:** “Resolution” section: winning option, resolver, timestamp, source URL, short reasoning, optional evidence.  
**Evidence:** Newly settled predictions show rationale + source; admin can add source/summary when finalizing.

---

## Phase 10 — Web Wallet Connection
**Scope:** WALLET_CONNECT_V2 feature flag; reliability + streamlined UX  
**Goal:** Reliable wallet connect on web; single Connect CTA; clear status and errors (wrong network, wallet not found, retry).  
**Evidence:** Connect works reliably; no stuck loading; flag-off behavior unchanged.
