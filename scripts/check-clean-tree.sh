#!/usr/bin/env bash
# Guardrail: exit non-zero if working tree is dirty (uncommitted or untracked).
# Use in CI or pre-push to avoid shipping accidental changes.
set -e
if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is dirty (uncommitted or untracked changes). Commit or stash before push." >&2
  git status --short >&2
  exit 1
fi
exit 0
