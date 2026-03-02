# Repo workflow and guardrails

- **Always branch from stable.** Use the last known stable tag (e.g. `fcz-stable-20260226`) or a clean `main`/release branch as the base for feature work.
- **Never develop in the production branch.** Work on a feature or chore branch; open a PR to merge into the deployment branch after review.
- **Before deploy: clean tree + tests.** Run `./scripts/check-clean-tree.sh` (or ensure `git status` is clean) and run the test suite before pushing to a branch that triggers deployment.

## Optional: pre-push check

To block pushes when the working tree is dirty:

```bash
# From repo root
./scripts/check-clean-tree.sh
```

You can wire this into a git pre-push hook or CI step so that pushes with uncommitted or untracked files fail until the tree is clean.
