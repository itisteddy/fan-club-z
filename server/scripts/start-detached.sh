#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="/tmp/fcz-server.log"
PID_FILE="/tmp/fcz-server.pid"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE" || true)"
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    echo "FCZ server already running (pid=$PID)"
    echo "log: $LOG_FILE"
    exit 0
  fi
fi

cd "$ROOT_DIR/server"

# Start detached so it survives editor/Codex session restarts.
nohup node dist/index.js >"$LOG_FILE" 2>&1 &
PID="$!"
echo "$PID" >"$PID_FILE"

echo "FCZ server started (pid=$PID)"
echo "log: $LOG_FILE"
