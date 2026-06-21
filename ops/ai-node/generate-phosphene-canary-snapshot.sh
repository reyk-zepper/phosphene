#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin${PATH:+:$PATH}"

AI_STACK_ROOT="${AI_STACK_ROOT:-/Users/raik./ai-stack}"
SERVICE_DIR="${PHOSPHENE_SERVICE_DIR:-$AI_STACK_ROOT/services/phosphene}"
OUTPUT_ROOT="${PHOSPHENE_CANARY_OUTPUT_ROOT:-$AI_STACK_ROOT/data/hermes/home/phosphene-handoffs/boundary-canary}"
PUBLISH_HELPER="${PHOSPHENE_PUBLISH_HELPER:-$AI_STACK_ROOT/scripts/publish-phosphene-snapshot.sh}"
LATEST_FILE="${PHOSPHENE_CANARY_LATEST_FILE:-$OUTPUT_ROOT/latest.json}"
RETENTION_COUNT="${PHOSPHENE_CANARY_RETENTION_COUNT:-48}"
SERVED_STATUS_DIR="${PHOSPHENE_CANARY_SERVED_DIR:-$SERVICE_DIR/dist/snapshots/canary}"
RUN_DRY_RUN=1
TARGET=""

usage() {
  cat <<USAGE
Usage: generate-phosphene-canary-snapshot.sh [--no-dry-run] [target-dir]

Generate a redacted Phosphene AI Node operational canary Boundary pack.

Default target:
  $OUTPUT_ROOT/ai-node-canary-<utc-stamp>

By default the script also runs the snapshot publisher in --dry-run mode.
It never publishes or deploys the generated pack.

The script updates:
  $LATEST_FILE
  $SERVED_STATUS_DIR/latest.json

Retention keeps the newest $RETENTION_COUNT ai-node-canary-* packs.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --no-dry-run)
      RUN_DRY_RUN=0
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    -*)
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [ -n "$TARGET" ]; then
        echo "ERROR: expected at most one target-dir" >&2
        usage >&2
        exit 2
      fi
      TARGET="$1"
      ;;
  esac
  shift
done

if [ -z "$TARGET" ]; then
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  TARGET="$OUTPUT_ROOT/ai-node-canary-$stamp"
fi

[ -d "$SERVICE_DIR" ] || {
  echo "ERROR: Phosphene service directory does not exist: $SERVICE_DIR" >&2
  exit 1
}

mkdir -p "$(dirname "$TARGET")"

cd "$SERVICE_DIR"
node scripts/generate-ai-node-canary-snapshot.mjs \
  --target "$TARGET" \
  --service-dir "$SERVICE_DIR" \
  --latest-file "$LATEST_FILE" \
  --retention-count "$RETENTION_COUNT"

mkdir -p "$SERVED_STATUS_DIR"
cp "$LATEST_FILE" "$SERVED_STATUS_DIR/latest.json"

if [ "$RUN_DRY_RUN" -eq 1 ]; then
  [ -x "$PUBLISH_HELPER" ] || {
    echo "ERROR: publish helper is not executable: $PUBLISH_HELPER" >&2
    exit 1
  }
  "$PUBLISH_HELPER" --dry-run "$TARGET"
fi

echo "Canary pack: $TARGET"
