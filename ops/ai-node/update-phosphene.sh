#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

root="/Users/raik./ai-stack"
service_dir="$root/services/phosphene"
repo_url="https://github.com/reyk-zepper/phosphene.git"
log_dir="$root/logs"
label="com.raik.phosphene"
plist="$HOME/Library/LaunchAgents/$label.plist"
port="5173"
snapshot_dir="$service_dir/dist/snapshots/current"
snapshot_backup_dir=""
snapshot_preserved=0
snapshot_restored=0

mkdir -p "$root/services" "$log_dir" "$HOME/Library/LaunchAgents"

exec >> "$log_dir/phosphene-update.log" 2>&1

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] phosphene update begin"

preserve_snapshot() {
  if [ ! -f "$snapshot_dir/manifest.json" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] phosphene snapshot preserve skipped: no manifest at $snapshot_dir/manifest.json"
    return 0
  fi

  snapshot_backup_dir="$(mktemp -d "${TMPDIR:-/tmp}/phosphene-snapshot-preserve.XXXXXX")"
  mkdir -p "$snapshot_backup_dir/current"
  cp -R "$snapshot_dir/." "$snapshot_backup_dir/current/"
  snapshot_preserved=1

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] phosphene snapshot preserved source=$snapshot_dir backup=$snapshot_backup_dir/current"
}

restore_snapshot() {
  if [ "$snapshot_preserved" -ne 1 ] || [ ! -d "$snapshot_backup_dir/current" ]; then
    return 0
  fi

  rm -rf "$snapshot_dir"
  mkdir -p "$snapshot_dir"
  cp -R "$snapshot_backup_dir/current/." "$snapshot_dir/"
  snapshot_restored=1

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] phosphene snapshot restored target=$snapshot_dir"
}

cleanup_snapshot_backup() {
  if [ "$snapshot_preserved" -eq 1 ] && [ "$snapshot_restored" -eq 0 ]; then
    restore_snapshot || true
  fi

  if [ -n "$snapshot_backup_dir" ] && [ -d "$snapshot_backup_dir" ]; then
    rm -rf "$snapshot_backup_dir"
  fi
}

trap cleanup_snapshot_backup EXIT

if [ ! -d "$service_dir/.git" ]; then
  rm -rf "$service_dir"
  git clone "$repo_url" "$service_dir"
fi

git -C "$service_dir" fetch origin --prune
git -C "$service_dir" checkout main
git -C "$service_dir" pull --ff-only origin main

run_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
  elif command -v corepack >/dev/null 2>&1; then
    corepack pnpm "$@"
  else
    npx --yes pnpm@9 "$@"
  fi
}

cd "$service_dir"
preserve_snapshot
run_pnpm install --frozen-lockfile
run_pnpm build
restore_snapshot

commit="$(git rev-parse HEAD)"
short_commit="$(git rev-parse --short HEAD)"
built_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$service_dir/dist/node-deploy.json" <<JSON
{
  "service": "phosphene",
  "node": "mac-mini-ai-node",
  "commit": "$commit",
  "short_commit": "$short_commit",
  "built_at": "$built_at",
  "bind": "127.0.0.1",
  "port": $port
}
JSON

launchctl bootout "gui/$(id -u)" "$plist" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$plist"
launchctl kickstart -k "gui/$(id -u)/$label" >/dev/null 2>&1 || true

for _ in {1..20}; do
  if curl -fsS "http://127.0.0.1:$port/" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

curl -fsS "http://127.0.0.1:$port/node-deploy.json" || true
echo
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] phosphene update end commit=$short_commit"
