#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin${PATH:+:$PATH}"

AI_STACK_ROOT="${AI_STACK_ROOT:-/Users/raik./ai-stack}"
SERVICE_DIR="${PHOSPHENE_SERVICE_DIR:-$AI_STACK_ROOT/services/phosphene}"
OUTPUT_ROOT="${PHOSPHENE_LIVE_ADAPTER_OUTPUT_ROOT:-$AI_STACK_ROOT/data/hermes/home/phosphene-handoffs/boundary-live}"
LATEST_FILE="${PHOSPHENE_LIVE_ADAPTER_LATEST_FILE:-$OUTPUT_ROOT/latest.json}"
RETENTION_COUNT="${PHOSPHENE_LIVE_ADAPTER_RETENTION_COUNT:-24}"
SERVED_LIVE_DIR="${PHOSPHENE_LIVE_ADAPTER_SERVED_DIR:-$SERVICE_DIR/dist/snapshots/live}"
TARGET=""

usage() {
  cat <<USAGE
Usage: generate-phosphene-live-adapter-snapshot.sh [target-dir]

Generate a redacted Phosphene AI Node near-live adapter Boundary pack.

Default target:
  $OUTPUT_ROOT/ai-node-live-<utc-stamp>

The script updates:
  $LATEST_FILE
  $SERVED_LIVE_DIR/latest.json
  $SERVED_LIVE_DIR/ai-node-live-<utc-stamp>/

Retention keeps the newest $RETENTION_COUNT ai-node-live-* packs.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
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
  TARGET="$OUTPUT_ROOT/ai-node-live-$stamp"
fi

[ -d "$SERVICE_DIR" ] || {
  echo "ERROR: Phosphene service directory does not exist: $SERVICE_DIR" >&2
  exit 1
}

mkdir -p "$(dirname "$TARGET")"

cd "$SERVICE_DIR"
node scripts/generate-ai-node-live-adapter-snapshot.mjs \
  --target "$TARGET" \
  --service-dir "$SERVICE_DIR" \
  --latest-file "$LATEST_FILE" \
  --retention-count "$RETENTION_COUNT"

latest_pack="$(basename "$TARGET")"
mkdir -p "$SERVED_LIVE_DIR"
rm -rf "$SERVED_LIVE_DIR/$latest_pack"
cp "$LATEST_FILE" "$SERVED_LIVE_DIR/latest.json"
cp -R "$TARGET" "$SERVED_LIVE_DIR/$latest_pack"

echo "Live adapter pack: $TARGET"
