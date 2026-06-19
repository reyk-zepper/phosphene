#!/usr/bin/env bash
set -euo pipefail

ALLOWED_ROOT="${PHOSPHENE_SNAPSHOT_ALLOWED_ROOT:-/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs}"
SERVICE_DIR="${PHOSPHENE_SERVICE_DIR:-/Users/raik./ai-stack/services/phosphene}"
TARGET_DIR="${PHOSPHENE_SNAPSHOT_TARGET:-dist/snapshots/current}"
MANIFEST_URL="${PHOSPHENE_SNAPSHOT_MANIFEST_URL:-http://127.0.0.1:5173/snapshots/current/manifest.json}"
AUDIT_LOG="${PHOSPHENE_SNAPSHOT_AUDIT_LOG:-/Users/raik./ai-stack/logs/phosphene-snapshot-publish.log}"
LOCK_DIR="${PHOSPHENE_SNAPSHOT_LOCK_DIR:-/tmp/phosphene-snapshot-publish.lock}"
DRY_RUN=0
SOURCE=""

usage() {
  cat <<USAGE
Usage: publish-phosphene-snapshot.sh [--dry-run] <source-pack-dir>

Validate and publish a redacted Phosphene Boundary snapshot pack.

Rules:
  source must be under: $ALLOWED_ROOT
  target is:           $SERVICE_DIR/$TARGET_DIR
  audit log is:        $AUDIT_LOG

Options:
  --dry-run  Validate and show publish plan without writing
  --help     Show this help
USAGE
}

ts() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log_event() {
  mkdir -p "$(dirname "$AUDIT_LOG")"
  printf '%s %s\n' "$(ts)" "$*" >> "$AUDIT_LOG"
}

fail() {
  local message="$1"
  echo "ERROR: $message" >&2
  log_event "status=failed dry_run=$DRY_RUN source=${SOURCE_REAL:-${SOURCE:-unset}} target=$SERVICE_DIR/$TARGET_DIR error=$message"
  exit 1
}

canonical_path() {
  python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$1"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      ;;
    -*)
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [ -n "$SOURCE" ]; then
        echo "ERROR: expected exactly one source-pack-dir" >&2
        usage >&2
        exit 2
      fi
      SOURCE="$1"
      ;;
  esac
  shift
done

if [ -z "$SOURCE" ]; then
  echo "ERROR: source-pack-dir is required" >&2
  usage >&2
  exit 2
fi

[ -d "$SOURCE" ] || fail "source directory does not exist: $SOURCE"
[ -d "$ALLOWED_ROOT" ] || fail "allowed handoff root does not exist: $ALLOWED_ROOT"
[ -d "$SERVICE_DIR" ] || fail "Phosphene service directory does not exist: $SERVICE_DIR"
[ -f "$SERVICE_DIR/scripts/publish-snapshot.mjs" ] || fail "Phosphene publisher script missing in service directory"

SOURCE_REAL="$(canonical_path "$SOURCE")"
ROOT_REAL="$(canonical_path "$ALLOWED_ROOT")"

case "$SOURCE_REAL" in
  "$ROOT_REAL"/*)
    ;;
  *)
    fail "source is outside allowed handoff root: $SOURCE_REAL"
    ;;
esac

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  fail "snapshot publish already in progress: $LOCK_DIR"
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

cd "$SERVICE_DIR"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || printf unknown)"
log_event "status=started dry_run=$DRY_RUN source=$SOURCE_REAL target=$SERVICE_DIR/$TARGET_DIR commit=$COMMIT"

echo "Source: $SOURCE_REAL"
echo "Target: $SERVICE_DIR/$TARGET_DIR"
echo "Commit: $COMMIT"

corepack pnpm publish:snapshot -- --source "$SOURCE_REAL" --target "$TARGET_DIR" --dry-run
log_event "status=dry_run_passed dry_run=$DRY_RUN source=$SOURCE_REAL target=$SERVICE_DIR/$TARGET_DIR commit=$COMMIT"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run complete. No files were published."
  log_event "status=success dry_run=1 source=$SOURCE_REAL target=$SERVICE_DIR/$TARGET_DIR commit=$COMMIT"
  exit 0
fi

corepack pnpm publish:snapshot -- --source "$SOURCE_REAL" --target "$TARGET_DIR"
MANIFEST_TMP="$(mktemp /tmp/phosphene-snapshot-manifest.XXXXXX)"
curl -fsS "$MANIFEST_URL" > "$MANIFEST_TMP"
MANIFEST_SHA="$(shasum -a 256 "$MANIFEST_TMP" | awk '{print $1}')"
rm -f "$MANIFEST_TMP"

echo "Served manifest verified: $MANIFEST_URL"
echo "Manifest sha256: $MANIFEST_SHA"
log_event "status=success dry_run=0 source=$SOURCE_REAL target=$SERVICE_DIR/$TARGET_DIR commit=$COMMIT manifest_sha256=$MANIFEST_SHA"
