#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_PORT="${SERVER_PORT:-3001}"
HEALTH_URL="http://127.0.0.1:${SERVER_PORT}/health"
SERVER_LOG="${SERVER_LOG:-/tmp/fcz-server.log}"
SERVER_PID_FILE="${SERVER_PID_FILE:-/tmp/fcz-server.pid}"
WATCHDOG_PID_FILE="${WATCHDOG_PID_FILE:-/tmp/fcz-mobile-watchdog.pid}"
WATCHDOG_LOG="${WATCHDOG_LOG:-/tmp/fcz-mobile-watchdog.log}"

listener_pid() {
  lsof -nP -iTCP:"${SERVER_PORT}" -sTCP:LISTEN -t 2>/dev/null | head -n1 || true
}

is_server_healthy() {
  curl -fsS -m 6 "${HEALTH_URL}" >/dev/null 2>&1
}

is_pid_alive() {
  local pid="${1:-}"
  [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1
}

start_backend() {
  # If the server is healthy, do nothing. If it's not healthy and there's no listener,
  # start it. If there's a listener but health is down, let restart_backend handle it.
  if is_server_healthy; then
    return
  fi
  if [[ -n "$(listener_pid)" ]]; then
    return
  fi
  echo "[watchdog] backend not running, starting..."
  bash "${ROOT_DIR}/server/scripts/start-local-dev-daemon.sh" >/dev/null 2>&1 || true
  local pid
  pid="$(cat "${SERVER_PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${pid}" ]]; then
    echo "${pid}" > "${SERVER_PID_FILE}"
  fi
  sleep 1
}

apply_adb_reverse() {
  if ! command -v adb >/dev/null 2>&1; then
    return
  fi
  adb start-server >/dev/null 2>&1 || true
  local devices
  devices="$(adb devices | awk 'NR>1 && $2=="device"{c++} END{print c+0}')"
  if [[ "${devices}" -gt 0 ]]; then
    adb reverse "tcp:${SERVER_PORT}" "tcp:${SERVER_PORT}" >/dev/null 2>&1 || true
  fi
}

restart_backend() {
  local lpid
  lpid="$(listener_pid)"
  if [[ -n "${lpid}" ]]; then
    echo "[watchdog] restarting unhealthy backend pid ${lpid}..."
    kill "${lpid}" >/dev/null 2>&1 || true
    sleep 1
  fi
  bash "${ROOT_DIR}/server/scripts/start-local-dev-daemon.sh" >/dev/null 2>&1 || true
  sleep 1
}

watchdog_loop() {
  local failures=0
  local last_restart_epoch=0
  echo "[watchdog] started at $(date)"
  while true; do
    if is_server_healthy; then
      failures=0
    else
      failures=$((failures + 1))
      # Avoid flapping: most device-side "unexpected end of stream" events are caused
      # by the backend being killed mid-request. Only restart after sustained failure.
      if [[ -z "$(listener_pid)" ]]; then
        start_backend
      else
        local now_epoch
        now_epoch="$(date +%s)"
        if [[ "${failures}" -ge 6 && $((now_epoch - last_restart_epoch)) -ge 30 ]]; then
          restart_backend
          last_restart_epoch="${now_epoch}"
          failures=0
        fi
      fi
    fi
    apply_adb_reverse
    sleep 5
  done
}

start_watchdog() {
  if [[ -f "${WATCHDOG_PID_FILE}" ]]; then
    local pid
    pid="$(cat "${WATCHDOG_PID_FILE}" || true)"
    if is_pid_alive "${pid}"; then
      echo "[watchdog] already running (pid ${pid})"
      exit 0
    fi
  fi
  # Include restart_backend in the child shell; watchdog_loop depends on it.
  nohup bash -c "$(declare -f listener_pid is_server_healthy is_pid_alive start_backend apply_adb_reverse restart_backend watchdog_loop); ROOT_DIR='${ROOT_DIR}'; SERVER_PORT='${SERVER_PORT}'; HEALTH_URL='${HEALTH_URL}'; SERVER_LOG='${SERVER_LOG}'; SERVER_PID_FILE='${SERVER_PID_FILE}'; watchdog_loop" >"${WATCHDOG_LOG}" 2>&1 &
  local pid=$!
  echo "${pid}" > "${WATCHDOG_PID_FILE}"
  echo "[watchdog] launched (pid ${pid})"
}

stop_watchdog() {
  if [[ -f "${WATCHDOG_PID_FILE}" ]]; then
    local pid
    pid="$(cat "${WATCHDOG_PID_FILE}" || true)"
    if is_pid_alive "${pid}"; then
      kill "${pid}" >/dev/null 2>&1 || true
      echo "[watchdog] stopped (pid ${pid})"
    fi
    rm -f "${WATCHDOG_PID_FILE}"
  else
    echo "[watchdog] not running"
  fi
}

status_watchdog() {
  local wpid="none"
  local spid="none"
  if [[ -f "${WATCHDOG_PID_FILE}" ]]; then
    wpid="$(cat "${WATCHDOG_PID_FILE}" || true)"
  fi
  if [[ -f "${SERVER_PID_FILE}" ]]; then
    spid="$(cat "${SERVER_PID_FILE}" || true)"
  fi
  echo "[watchdog] pid: ${wpid}"
  echo "[server] pidfile: ${spid}"
  echo "[server] listener: $(listener_pid || true)"
  if is_server_healthy; then
    echo "[server] health: OK"
  else
    echo "[server] health: DOWN"
  fi
}

case "${1:-}" in
  start)
    start_watchdog
    ;;
  stop)
    stop_watchdog
    ;;
  restart)
    stop_watchdog
    start_watchdog
    ;;
  status)
    status_watchdog
    ;;
  *)
    echo "Usage: bash server/scripts/mobile-dev-service.sh {start|stop|restart|status}"
    exit 1
    ;;
esac
