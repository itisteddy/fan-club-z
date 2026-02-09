#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_PORT="${SERVER_PORT:-3001}"
HEALTH_URL="http://127.0.0.1:${SERVER_PORT}/health"
PREDICTIONS_URL="http://127.0.0.1:${SERVER_PORT}/api/v2/predictions?page=1&limit=5"
SERVER_LOG="${SERVER_LOG:-/tmp/fcz-server.log}"
SERVER_PID_FILE="${SERVER_PID_FILE:-/tmp/fcz-server.pid}"
ENABLE_WATCHDOG="${ENABLE_WATCHDOG:-1}"
WATCH_INTERVAL_SECS="${WATCH_INTERVAL_SECS:-3}"
APP_PACKAGE="${APP_PACKAGE:-com.fanclubz.app}"
APK_PATH="${APK_PATH:-${ROOT_DIR}/client/android/app/build/outputs/apk/debug/app-debug.apk}"

DO_BUILD=0
DO_REINSTALL=0
DO_RESET_DATA=0
DO_LAUNCH=1
DO_FORCE_RESTART_SERVER=0
DO_WATCH=0
SKIP_BUILD_ON_REINSTALL=0

usage() {
  cat <<'EOF'
Usage: bash server/scripts/start-mobile-dev.sh [options]

Options:
  --build             Build Android web assets + sync + assembleDebug
  --reinstall         Install APK on device (uses APK_PATH)
  --no-build          Skip build step (advanced; mainly for fast relaunches)
  --reset-data        Clear app data before launch
  --no-launch         Do not relaunch the app
  --restart-server    Force backend restart even if healthy
  --watch             Keep running; maintain backend + adb reverse
  -h, --help          Show this help

Env overrides:
  SERVER_PORT, APP_PACKAGE, APK_PATH, SERVER_LOG, ENABLE_WATCHDOG, WATCH_INTERVAL_SECS
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) DO_BUILD=1 ;;
    --reinstall) DO_REINSTALL=1 ;;
    --no-build) SKIP_BUILD_ON_REINSTALL=1 ;;
    --reset-data) DO_RESET_DATA=1 ;;
    --no-launch) DO_LAUNCH=0 ;;
    --restart-server) DO_FORCE_RESTART_SERVER=1 ;;
    --watch) DO_WATCH=1 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "[mobile-dev] unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

# Default safe behavior: when reinstalling, include a fresh build so
# connected-device testing always reflects latest client code changes.
if [[ "${DO_REINSTALL}" -eq 1 && "${DO_BUILD}" -eq 0 && "${SKIP_BUILD_ON_REINSTALL}" -eq 0 ]]; then
  DO_BUILD=1
  echo "[mobile-dev] --reinstall detected: enabling --build to ensure latest app code is deployed."
fi

is_server_up() {
  curl -fsS -m 6 "${HEALTH_URL}" >/dev/null 2>&1
}

has_adb_device() {
  [[ "$(adb devices | awk 'NR>1 && $2=="device"{c++} END{print c+0}')" -gt 0 ]]
}

listener_pid() {
  lsof -nP -iTCP:"${SERVER_PORT}" -sTCP:LISTEN -t 2>/dev/null | head -n1 || true
}

prediction_count() {
  local body
  body="$(curl -fsS -m 5 "${PREDICTIONS_URL}" || true)"
  if [[ -z "${body}" ]]; then
    echo "0"
    return
  fi
  # Try to read pagination.total first, then fallback to counting ids in data.
  local total
  total="$(echo "${body}" | sed -n 's/.*"total":[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -n1)"
  if [[ -n "${total}" ]]; then
    echo "${total}"
    return
  fi
  echo "${body}" | grep -o '"id":"' | wc -l | tr -d ' '
}

echo "[mobile-dev] target backend: ${HEALTH_URL}"

if [[ "${DO_FORCE_RESTART_SERVER}" -eq 1 ]]; then
  echo "[mobile-dev] forcing backend restart..."
  if [[ -f "${SERVER_PID_FILE}" ]]; then
    OLD_PID="$(cat "${SERVER_PID_FILE}" || true)"
    if [[ -n "${OLD_PID}" ]]; then
      kill "${OLD_PID}" >/dev/null 2>&1 || true
    fi
  fi
  PORT_PID="$(listener_pid)"
  if [[ -n "${PORT_PID}" ]]; then
    kill "${PORT_PID}" >/dev/null 2>&1 || true
  fi
  sleep 1
fi

if is_server_up && [[ "${DO_FORCE_RESTART_SERVER}" -eq 0 ]]; then
  echo "[mobile-dev] backend already running."
else
  PORT_PID="$(listener_pid)"
  if [[ -n "${PORT_PID}" && "${DO_FORCE_RESTART_SERVER}" -eq 0 ]]; then
    echo "[mobile-dev] unhealthy listener on ${SERVER_PORT} (pid ${PORT_PID}); restarting it."
    kill "${PORT_PID}" >/dev/null 2>&1 || true
    sleep 1
    PORT_PID=""
  fi
  if [[ -n "${PORT_PID}" ]]; then
    # Watchdog may have already brought the backend back up. Only fail if it's unstable.
    if is_server_up; then
      echo "[mobile-dev] port ${SERVER_PORT} occupied by healthy backend (pid ${PORT_PID}); continuing."
    else
      echo "[mobile-dev] port ${SERVER_PORT} still occupied after restart attempt."
      exit 1
    fi
  else
    echo "[mobile-dev] starting backend..."
    bash "${ROOT_DIR}/server/scripts/start-local-dev-daemon.sh"
  fi
fi

echo "[mobile-dev] waiting for backend health..."
for _ in $(seq 1 40); do
  if is_server_up; then
    echo "[mobile-dev] backend healthy."
    break
  fi
  sleep 1
done

if ! is_server_up; then
  echo "[mobile-dev] backend failed to become healthy."
  echo "[mobile-dev] last logs from ${SERVER_LOG}:"
  tail -n 80 "${SERVER_LOG}" || true
  exit 1
fi

if [[ "${ENABLE_WATCHDOG}" == "1" ]]; then
  echo "[mobile-dev] ensuring mobile watchdog is running..."
  bash "${ROOT_DIR}/server/scripts/mobile-dev-service.sh" start >/dev/null 2>&1 || true
fi

# Final backend check before device operations to avoid flaky handoff.
if ! curl -fsS -m 8 "${HEALTH_URL}" >/dev/null 2>&1; then
  echo "[mobile-dev] backend listener exists but health endpoint is unstable."
  echo "[mobile-dev] refusing to continue to avoid 'No prediction found' on device."
  exit 1
fi

PRED_COUNT="$(prediction_count)"
echo "[mobile-dev] predictions visible from backend: ${PRED_COUNT}"

if command -v adb >/dev/null 2>&1; then
  echo "[mobile-dev] applying adb reverse tcp:${SERVER_PORT}..."
  adb start-server >/dev/null 2>&1 || true
  if has_adb_device; then
    adb reverse "tcp:${SERVER_PORT}" "tcp:${SERVER_PORT}" >/dev/null
  fi
  DEVICE_COUNT="$(adb devices | awk 'NR>1 && $2=="device"{c++} END{print c+0}')"
  if [[ "${DEVICE_COUNT}" -eq 0 ]]; then
    echo "[mobile-dev] no connected Android device detected."
  else
    echo "[mobile-dev] adb reverse applied (${DEVICE_COUNT} device(s))."

    if [[ "${DO_BUILD}" -eq 1 ]]; then
      echo "[mobile-dev] building Android app..."
      npm --prefix "${ROOT_DIR}/client" run build:android
      (cd "${ROOT_DIR}/client" && ./node_modules/.bin/cap sync android)
      (cd "${ROOT_DIR}/client/android" && ./gradlew assembleDebug)
    fi

    if [[ "${DO_REINSTALL}" -eq 1 ]]; then
      if [[ ! -f "${APK_PATH}" ]]; then
        echo "[mobile-dev] apk not found at: ${APK_PATH}"
        exit 1
      fi
      echo "[mobile-dev] reinstalling app..."
      adb install -r "${APK_PATH}"
    fi

    echo "[mobile-dev] stopping app: ${APP_PACKAGE}"
    adb shell am force-stop "${APP_PACKAGE}" >/dev/null 2>&1 || true

    if [[ "${DO_RESET_DATA}" -eq 1 ]]; then
      echo "[mobile-dev] clearing app data: ${APP_PACKAGE}"
      adb shell pm clear "${APP_PACKAGE}" >/dev/null
    fi

    if [[ "${DO_LAUNCH}" -eq 1 ]]; then
      echo "[mobile-dev] launching app: ${APP_PACKAGE}"
      adb shell monkey -p "${APP_PACKAGE}" -c android.intent.category.LAUNCHER 1 >/dev/null
    else
      echo "[mobile-dev] launch skipped (--no-launch)."
    fi
  fi
else
  echo "[mobile-dev] adb not found in PATH; skipped adb reverse."
fi

echo "[mobile-dev] done."
echo "[mobile-dev] health: ${HEALTH_URL}"
if curl -fsS -m 8 "${HEALTH_URL}" >/dev/null 2>&1; then
  FINAL_COUNT="$(prediction_count)"
  echo "[mobile-dev] post-run predictions visible from backend: ${FINAL_COUNT}"
else
  echo "[mobile-dev] post-run backend check FAILED."
  exit 1
fi

if [[ "${DO_WATCH}" -eq 1 ]]; then
  echo "[mobile-dev] watch mode enabled (interval=${WATCH_INTERVAL_SECS}s). Press Ctrl+C to stop."
  last_health="ok"
  while true; do
    if command -v adb >/dev/null 2>&1 && has_adb_device; then
      adb reverse "tcp:${SERVER_PORT}" "tcp:${SERVER_PORT}" >/dev/null 2>&1 || true
    fi

    if curl -fsS -m 3 "${HEALTH_URL}" >/dev/null 2>&1; then
      if [[ "${last_health}" != "ok" ]]; then
        echo "[mobile-dev] backend recovered."
        last_health="ok"
      fi
    else
      if [[ "${last_health}" != "down" ]]; then
        echo "[mobile-dev] backend unhealthy; restarting..."
        last_health="down"
      fi
      PORT_PID="$(listener_pid)"
      if [[ -n "${PORT_PID}" ]]; then
        kill "${PORT_PID}" >/dev/null 2>&1 || true
        sleep 1
      fi
      bash "${ROOT_DIR}/server/scripts/start-local-dev-daemon.sh" >/dev/null 2>&1 || true
    fi

    sleep "${WATCH_INTERVAL_SECS}"
  done
fi
