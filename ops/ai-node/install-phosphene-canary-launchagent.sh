#!/usr/bin/env bash
set -euo pipefail

AI_STACK_ROOT="${AI_STACK_ROOT:-/Users/raik./ai-stack}"
SERVICE_DIR="${PHOSPHENE_SERVICE_DIR:-$AI_STACK_ROOT/services/phosphene}"
PLIST_DIR="${PHOSPHENE_CANARY_PLIST_DIR:-$HOME/Library/LaunchAgents}"
LABEL="${PHOSPHENE_CANARY_LABEL:-com.raik.phosphene-canary}"
INTERVAL_SECONDS="${PHOSPHENE_CANARY_INTERVAL_SECONDS:-900}"
DRY_RUN=0

usage() {
  cat <<USAGE
Usage: install-phosphene-canary-launchagent.sh [--dry-run] [options]

Install a macOS LaunchAgent that runs the redacted Phosphene AI Node canary.

Options:
  --dry-run                  Write the plist but do not install, bootstrap, or kickstart launchctl
  --ai-stack-root <dir>      AI stack root (default: $AI_STACK_ROOT)
  --service-dir <dir>        Phosphene service directory (default: $SERVICE_DIR)
  --plist-dir <dir>          LaunchAgent plist directory (default: $PLIST_DIR)
  --interval-seconds <secs>  Run interval (default: $INTERVAL_SECONDS)
  --help                    Show this help
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --ai-stack-root|--service-dir|--plist-dir|--interval-seconds)
      value="${2:-}"
      if [ -z "$value" ] || [[ "$value" == --* ]]; then
        echo "ERROR: $1 requires a value" >&2
        usage >&2
        exit 2
      fi
      case "$1" in
        --ai-stack-root) AI_STACK_ROOT="$value" ;;
        --service-dir) SERVICE_DIR="$value" ;;
        --plist-dir) PLIST_DIR="$value" ;;
        --interval-seconds) INTERVAL_SECONDS="$value" ;;
      esac
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

case "$INTERVAL_SECONDS" in
  ''|*[!0-9]*)
    echo "ERROR: --interval-seconds must be a positive integer" >&2
    exit 2
    ;;
esac

if [ "$INTERVAL_SECONDS" -le 0 ]; then
  echo "ERROR: --interval-seconds must be greater than zero" >&2
  exit 2
fi

SCRIPT_SOURCE="$SERVICE_DIR/ops/ai-node/generate-phosphene-canary-snapshot.sh"
SCRIPT_TARGET="$AI_STACK_ROOT/scripts/generate-phosphene-canary-snapshot.sh"
LOG_DIR="$AI_STACK_ROOT/logs"
LOG_PATH="$LOG_DIR/phosphene-canary.log"
PLIST_PATH="$PLIST_DIR/$LABEL.plist"

mkdir -p "$PLIST_DIR" "$LOG_DIR" "$AI_STACK_ROOT/scripts"

if [ "$DRY_RUN" -eq 0 ]; then
  [ -f "$SCRIPT_SOURCE" ] || {
    echo "ERROR: canary wrapper source is missing: $SCRIPT_SOURCE" >&2
    exit 1
  }
  install -m 755 "$SCRIPT_SOURCE" "$SCRIPT_TARGET"
fi

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$SCRIPT_TARGET</string>
  </array>
  <key>StartInterval</key>
  <integer>$INTERVAL_SECONDS</integer>
  <key>RunAtLoad</key>
  <false/>
  <key>StandardOutPath</key>
  <string>$LOG_PATH</string>
  <key>StandardErrorPath</key>
  <string>$LOG_PATH</string>
  <key>WorkingDirectory</key>
  <string>$SERVICE_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>COREPACK_ENABLE_DOWNLOAD_PROMPT</key>
    <string>0</string>
  </dict>
</dict>
</plist>
PLIST

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run complete. Wrote plist: $PLIST_PATH"
  exit 0
fi

launchctl bootout "gui/$(id -u)" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH"
launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true

echo "Installed LaunchAgent: $PLIST_PATH"
echo "Canary log: $LOG_PATH"
