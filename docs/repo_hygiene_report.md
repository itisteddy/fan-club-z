# Repo hygiene report

**Generated:** 2026-03-02  
**Branch (at audit):** `chore/repo-cleanup-20260302`  
**HEAD:** `20d17c42` (from tag `fcz-stable-20260226` — last known stable)

---

## Phase A — Safety backup (completed)

| Item | Value |
|------|--------|
| Pre-cleanup branch | `clean-main` |
| Pre-cleanup HEAD | `ccd323a6ad29013807822769b4c851e54aeb97b0` |
| Backup branch | `backup/dirty-20260302` |
| Backup commit | Dirty state (including `tmp/`) committed on backup branch |
| Working base after backup | Checked out `fcz-stable-20260226`, created `chore/repo-cleanup-20260302` |

---

## Phase B — Audit (before clean)

### Status snapshot

- **File:** `.local/tmp/fcz_git_status_before.txt` (or OS temp during audit)
- **Untracked count:** 1 entry
- **Tracked changes:** 0 (clean working tree except untracked)

### Untracked entries

| Path | Note |
|------|------|
| `tmp/` | Directory containing embedded git repo `tmp/fcz-walletfix-push` (agent/scratch work). Should be ignored and removed. |

### Preview: `git clean -nd` (untracked only)

- `Would skip repository tmp/fcz-walletfix-push` (git does not remove nested repos by default with `clean -fd`; the parent `tmp/` can be removed manually or after clearing nested repo).

### Top-level / workspace folders (existing on disk)

| Folder | Already in .gitignore? | Action |
|--------|------------------------|--------|
| `node_modules/` | Yes | Keep ignored; do not commit. |
| `client/node_modules/`, `server/node_modules/` | Yes (root rules) | Keep ignored. |
| `dist/`, `client/dist/`, `server/dist/` | Yes | Keep ignored. |
| `.vercel/` | Yes (as `.vercel`) | Keep ignored. |
| `tmp/` | **Added in Phase C** | Ignore + remove. |
| `.turbo/`, `.cache/` | Added in Phase C | Prevent recurrence. |
| `coverage/`, `logs/` | coverage yes; logs added | Prevent recurrence. |

### Recommendation

- **Remove:** `tmp/` (scratch/agent directory; not part of stable tree).
- **Do not remove:** `node_modules/`, `dist/`, `.vercel/` (already ignored; leave to normal tooling).
- **Harden .gitignore:** Add `tmp/`, `.tmp/`, `.temp/`, `.turbo/`, `.cache/`, `logs/`, `.nyc_output/` (done in Phase C).

---

## Phase C — .gitignore hardening

Root `.gitignore` extended with:

- `tmp/`, `.tmp/`, `.temp/`
- `.turbo/`, `.cache/`
- `logs/`, `.nyc_output/`

No existing rules removed. `.env.example` and committed env templates are **not** ignored.

---

## Phase D — Clean (after)

- **Removed:** `tmp/` (manually, as it contained nested repo and was skipped by `git clean -fd`).
- **Status after:** Saved to `.local/tmp/fcz_git_status_after.txt` (or OS temp).

---

## Before vs after summary

| Metric | Before | After |
|--------|--------|--------|
| Untracked entries | 1 (`tmp/`) | 0 |
| Key folders removed | — | `tmp/` |
| .gitignore rules added | — | `tmp/`, `.tmp/`, `.temp/`, `.turbo/`, `.cache/`, `logs/`, `.nyc_output/` |
