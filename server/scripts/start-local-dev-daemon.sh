#!/usr/bin/env bash
set -euo pipefail

# Starts the API server as a background process for local device testing.
# Uses bash (not zsh) to avoid bg_nice issues and keeps logs in /tmp.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PID_FILE="/tmp/fcz-server.pid"
LOG_FILE="/tmp/fcz-server.log"
PORT="${PORT:-3001}"
HEALTH_URL="http://127.0.0.1:${PORT}/health"

listener_pid() {
  lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null | head -n1 || true
}

is_healthy() {
  curl -fsS -m 6 "${HEALTH_URL}" >/dev/null 2>&1
}

pid_is_alive() {
  local pid="${1:-}"
  [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null
}

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${old_pid:-}" ]] && pid_is_alive "$old_pid"; then
    if is_healthy; then
      echo "Server already running (pid=$old_pid). Logs: $LOG_FILE"
      exit 0
    fi
    # PID may be stale/reused or process is unhealthy: clear and recover.
    echo "Existing pid $old_pid is not healthy, restarting..."
    kill "$old_pid" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# If any healthy listener already exists on port, adopt it.
existing_listener="$(listener_pid)"
if [[ -n "${existing_listener}" ]] && is_healthy; then
  echo "$existing_listener" >"$PID_FILE"
  echo "Server already running on port ${PORT} (pid=$existing_listener). Logs: $LOG_FILE"
  exit 0
fi

export HOST="${HOST:-0.0.0.0}"
export PORT
# Mobile/local device testing should be deterministic and lightweight.
# Allow overriding these from the shell when needed.
export NODE_ENV="${NODE_ENV:-development}"
export PAYMENTS_ENABLE="${PAYMENTS_ENABLE:-0}"

cd "$ROOT_DIR"
if [[ ! -f "$ROOT_DIR/server/dist/index.js" ]]; then
  npm --prefix server run build:server >/dev/null 2>&1 || true
fi
nohup npm --prefix server run start >"$LOG_FILE" 2>&1 &
pid="$!"
echo "$pid" >"$PID_FILE"

echo "Started server (pid=$pid) on $HOST:$PORT"
echo "Logs: $LOG_FILE"
