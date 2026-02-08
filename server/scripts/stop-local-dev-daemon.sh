#!/usr/bin/env bash
set -euo pipefail

PID_FILE="/tmp/fcz-server.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No pid file at $PID_FILE"
  exit 0
fi

pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -z "${pid:-}" ]]; then
  rm -f "$PID_FILE"
  echo "Removed empty pid file"
  exit 0
fi

if kill -0 "$pid" 2>/dev/null; then
  kill "$pid" 2>/dev/null || true
  sleep 0.2
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
  echo "Stopped server pid=$pid"
else
  echo "Process pid=$pid not running"
fi

rm -f "$PID_FILE"
