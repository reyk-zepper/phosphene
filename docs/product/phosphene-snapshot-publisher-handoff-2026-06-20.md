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

Codex performed host-side publication through the deployed Phosphene publisher CLI:

```bash
cd /Users/raik./ai-stack/services/phosphene
corepack pnpm publish:snapshot -- --source /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-20 --target dist/snapshots/current --dry-run
corepack pnpm publish:snapshot -- --source /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-20 --target dist/snapshots/current
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

Served manifest:

```bash
curl -fsS http://127.0.0.1:5173/snapshots/current/manifest.json
```

The served manifest returned `schema_version: "phosphene.boundary.v0.1.2"`, `source_agent: "hermes"`, and four synthetic trace bundle entries.

## Follow-Up

To let Hermes publish directly in a later slice, choose one of these:

1. Mount `/Users/raik./ai-stack/services/phosphene` read/write into the Hermes container with a narrow path and restart Hermes.
2. Add a host-side publish helper that accepts only a validated handoff directory and can be invoked through a controlled Hermes tool boundary.
3. Keep Codex/operator host-side publication as the explicit approval step until the near-live adapter exists.
