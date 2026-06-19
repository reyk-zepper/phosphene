# Phosphene Snapshot Publisher Handoff — 2026-06-20

## Summary

The v0.1.8 snapshot publisher contract was exercised on the AI Node using a verified Hermes-origin synthetic Boundary pack.

This is **not live telemetry**. No live Hermes, AAG, OpenClaw, Sentinel, Gmail, Workspace, provider, customer, credential, or private infrastructure data was read. No live side effects were performed.

## Source Pack

Host path:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-20/
```

Container-equivalent path:

```text
/opt/data/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-20/
```

The source pack is a v0.1.8 staging copy of the verified Hermes-origin synthetic handoff pack from 2026-06-19. It contains:

- `hermes-aag-gmail-draft.synthetic.json`
- `hermes-openclaw-worker.synthetic.json`
- `aag-workspace-bundle.synthetic.json`
- `sentinel-recovery.synthetic.json`
- `manifest.json`
- `validation-report.json`
- `README.md`

## Hermes Runtime Note

The v0.1.8 request was copied into Hermes' request directory:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/requests/phosphene-snapshot-publisher-v018-request.md
```

Direct Hermes one-shot execution was attempted inside the running Hermes container with `run_agent.py`, but the provider call returned HTTP 403 from the configured Codex backend. The Hermes container also does not currently mount the host Phosphene service path:

```text
/Users/raik./ai-stack/services/phosphene/
```

So Hermes can see `/opt/data/phosphene-handoffs/`, but cannot directly publish into the deployed Phosphene `dist/snapshots/current/` path from inside the container.

## Publish Command

Codex first performed host-side publication through the deployed Phosphene publisher CLI:

```bash
cd /Users/raik./ai-stack/services/phosphene
corepack pnpm publish:snapshot -- --source /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-20 --target dist/snapshots/current --dry-run
corepack pnpm publish:snapshot -- --source /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-20 --target dist/snapshots/current
```

After the follow-up helper decision, the AI Node host helper was installed:

```text
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh
```

Versioned source copy:

```text
ops/ai-node/publish-phosphene-snapshot.sh
```

The helper was then used for the same source pack:

```bash
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh --dry-run /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-20
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-20
```

## Verification

Publisher dry-run:

```text
Validated 6 file(s), 0 failed.
DRY RUN: would publish 7 file(s)
```

Publisher write:

```text
Validated 6 file(s), 0 failed.
Published 7 file(s) to /Users/raik./ai-stack/services/phosphene/dist/snapshots/current
```

Helper behavior:

```text
PASS help
PASS dry-run allowed source
PASS reject outside source
```

Helper publish verification:

```text
Served manifest verified: http://127.0.0.1:5173/snapshots/current/manifest.json
Manifest sha256: 428beefab35ca5df6460dd1aeeae1af71a9e3c55f6fe9c90ae47f86bc2794175
```

Audit log:

```text
/Users/raik./ai-stack/logs/phosphene-snapshot-publish.log
```

## Deploy Snapshot Persistence

The published snapshot lives in the deployed build output:

```text
/Users/raik./ai-stack/services/phosphene/dist/snapshots/current/
```

Because a normal Vite build can recreate `dist/`, the AI Node deploy script now preserves the current published snapshot before build and restores it afterwards.

AI Node deploy script:

```text
/Users/raik./ai-stack/scripts/update-phosphene.sh
```

Versioned source copy:

```text
ops/ai-node/update-phosphene.sh
```

Expected update log markers:

```text
phosphene snapshot preserved
phosphene snapshot restored
```

Served manifest:

```bash
curl -fsS http://127.0.0.1:5173/snapshots/current/manifest.json
```

The served manifest returned `schema_version: "phosphene.boundary.v0.1.2"`, `source_agent: "hermes"`, and four synthetic trace bundle entries.

## Follow-Up

The current preferred architecture is now:

```text
Hermes writes redacted Boundary packs under the handoff root.
The host helper validates, publishes, verifies, and logs.
Phosphene serves only /snapshots/current/.
```

Next, expose this helper through a controlled Hermes tool boundary or approval flow instead of mounting the Phosphene service path into the Hermes container.
