# Release paths reference

## Main workspace (your normal project)

**Path:** `/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z v2.0/FanClubZ-version2.0`

This is where you do day-to-day work. It can be dirty (feature work, experiments, uncommitted changes). Do **not** push to production from here when you have unrelated changes.

---

## Clean temp clone (production push / hotfix)

**Path:** `/tmp/fcz-main-push`

A separate clone used only for **clean production pushes** and hotfixes. Use this when you need to push only specific commits to `main` (or a release branch) without carrying over uncommitted or unrelated work from the main workspace.

### Typical workflow

1. In main workspace: commit and push your release branch (or ensure the commits you want are on a branch).
2. In `/tmp/fcz-main-push`: `git fetch`, checkout the branch, fix any build issues if needed, then push to production.
3. Main workspace is never modified by this; the temp clone stays a clean, scoped view of the repo.
