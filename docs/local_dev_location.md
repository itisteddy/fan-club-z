# Local dev location

## Canonical path

**Use this path for all development:**

```
~/dev/fanclubz
```

On macOS this resolves to `/Users/<you>/dev/fanclubz`.

## Do not use OneDrive

Do **not** put the repo in OneDrive, iCloud, or other cloud-synced folders. Sync/locks cause build hangs, git issues, and flaky behavior. Keep the repo on local disk only.

## Clone and install

```bash
mkdir -p ~/dev
cd ~/dev
git clone https://github.com/itisteddy/fan-club-z.git fanclubz
cd fanclubz
pnpm install
```

## Build and run

```bash
pnpm build          # full monorepo build
pnpm dev            # start dev server
```

## Temp files

Scripts and tooling use a repo-local temp directory:

```
.local/tmp/
```

This directory is gitignored. Server PID/log files, audit outputs, and other local artifacts live here instead of OS `/tmp`. Avoid hardcoding `/tmp` in scripts.
