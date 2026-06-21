# Phosphene Node Observer Demo

## Demo Goal

Show that Phosphene can explain AI-Node behavior from redacted Boundary traces without claiming raw live telemetry.

## Current Build

- App version: `v0.1.24`
- Deployed service: Phosphene on the Mac mini AI Node
- Mode to show: `Node Observer`
- Data class: synthetic/redacted fixtures, locally imported Boundary JSON, published redacted AI Node snapshots, redacted canary markers, and redacted near-live adapter snapshots

## What Works Today

- Switch between `Reasoning Lab` and `Node Observer`.
- Select built-in redacted AI-node demo traces.
- Select Hermes synthetic handoff traces generated on the AI Node.
- Select the fresh `Hermes Synthetic Handoffs 2026-06-19` gallery group.
- Load the published redacted snapshot from `/snapshots/current/`.
- Refresh the served snapshot through the AI Node publisher CLI after validation.
- See the `Published AI Node Snapshot` panel with Hermes as the current published source, classification, manifest, validation, and no-live-telemetry status.
- Generate a redacted AI Node operational canary pack and verify it through the publisher dry-run.
- Load the redacted near-live AI Node adapter marker from `/snapshots/live/latest.json`.
- See the `AI Node Live Adapter` panel with freshness, manifest hash, retention, validation state, and no-raw-live-telemetry status.
- Generate a redacted near-live AI Node adapter pack and sync it into served `/snapshots/live/` output.
- Generate a redacted Hermes near-live adapter pack from coarse Hermes operational markers only.
- Generate a redacted multi-service near-live adapter pack for Hermes, AAG, OpenClaw, Sentinel, Gmail, and Workspace from marker counts and file stats only.
- Import multiple Boundary JSON files at once.
- Import `manifest.json` and `validation-report.json` as support context.
- See accepted traces, blocked files, and failed checks in the intake table.
- Inspect run summary, event graph, and detail panel.
- See readiness state:
  - Boundary Contract: ready
  - Handoff Intake: ready or partial
  - Published Snapshot: ready, partial, or not connected
  - AI Node Live Adapter: ready, partial, blocked, or not connected

## What To Say

Use this framing:

```text
Phosphene visualizes redacted AI-node Boundary traces. It can ingest Hermes-generated handoff packs, validate them locally, and render the run as an event graph with risk, decision, status, and recovery context.
```

Use this for the v0.1.7 snapshot step:

```text
Phosphene can now load a published redacted AI-node snapshot from its served snapshot boundary. This is still not live telemetry; it is a sanitized Boundary pack made available to the observer UI.
```

Use this for the v0.1.8 publisher step:

```text
Phosphene now has an AI Node publisher contract: a redacted Boundary pack can be validated and atomically published into the served snapshot path. This still is not streaming telemetry; it is a controlled published snapshot.
```

Use this for the v0.1.9/v0.1.10 operator-demo step:

```text
Phosphene preserves the latest published snapshot across AI Node app deploys and shows its status directly in Node Observer. The UI tells us the source, classification, manifest size, validation state, and that this is not live telemetry.
```

Use this for the operational canary status:

```text
Phosphene shows the latest redacted AI Node Canary marker from /snapshots/canary/latest.json and marks it fresh or stale with a 30-minute window. This proves the AI Node can produce sanitized operational status for the observer surface, but it is still not live agent telemetry.
```

Use this for the v0.1.22 near-live adapter path:

```text
Phosphene can now read a redacted near-live adapter marker from /snapshots/live/latest.json, load its referenced Boundary pack, and render the adapter output as an AI Node Live Adapter trace. This is a sanitized adapter boundary, not raw live telemetry.
```

Use this for the v0.1.23 Hermes adapter path:

```text
Phosphene can now show a Hermes-specific near-live adapter trace generated on the AI Node from coarse operational markers only: marker presence, size bands, modified-time markers, public gateway status labels, and structural cron-job counts. It still does not expose Hermes prompts, logs, config values, credentials, private URLs, Gmail/Workspace content, or provider payloads.
```

Use this for the v0.1.24 multi-service adapter path:

```text
Phosphene can now show separated redacted near-live adapter traces for Hermes, AAG, OpenClaw, Sentinel, Gmail, and Workspace in the shared AI Node Live Adapter group. The AI Node adapter emits marker presence, count-only runtime shape, coarse file classes, and modified-time markers. It still does not expose logs, config values, prompts, host paths, private URLs, credentials, provider payloads, Gmail message content, or Workspace document content.
```

Use this when explaining the current limitation:

```text
The live adapter path is marker-level only. It proves redacted service boundaries and freshness, but Phosphene still does not observe raw live agent content, private side effects, provider calls, Gmail messages, or Workspace documents.
```

## What Not To Claim

Do not claim:

- Phosphene is observing raw live Hermes prompts, logs, config values, or private run payloads today.
- Hermes runs locally on the development machine.
- The browser reads private AI Node filesystem paths.
- The published snapshot is a streaming or near-live adapter.
- The near-live adapter exposes raw live telemetry, private files, provider payloads, Gmail/Workspace content, or host paths.
- The snapshot publisher reads private provider data or performs live side effects.
- Phosphene stores or displays secrets, OAuth data, private URLs, raw provider IDs, or customer data.
- Phosphene replaces AAG, Hermes, OpenClaw, or Sentinels.

## Demo Path

1. Open Phosphene.
2. Use `Node Observer`.
3. Select a built-in demo trace such as `Hermes -> AAG -> Gmail Draft`.
4. Select a Hermes synthetic handoff trace.
5. Point out:
   - system sources
   - status
   - risk
   - approvals
   - failure/recovery count
   - detail panel evidence fields
6. Import the current handoff directory files:
   - four `*.synthetic.json` trace bundles
   - `manifest.json`
   - `validation-report.json`
7. Show the intake table.
8. Point out the published snapshot panel.
9. Point out the canary panel and the `No live telemetry` boundary.
10. Point out the `AI Node Live Adapter` panel and its `No raw live telemetry` boundary.
11. Point out the readiness strip and the `AI Node Live Adapter` status.

## Verification Before Demo

Run locally before claiming the demo build is healthy:

```bash
pnpm test -- --run
pnpm validate:traces -- src/core/traces/handoffs/hermes-synthetic-2026-06-18
pnpm validate:traces -- public/snapshots/current
pnpm publish:snapshot -- --source public/snapshots/current --target /tmp/phosphene-snapshot-publish-check --dry-run
pnpm generate:live-adapter -- --target /tmp/phosphene-live-adapter-check --latest-file /tmp/phosphene-live-adapter-latest.json
mkdir -p /tmp/phosphene-empty-hermes-home/cron /tmp/phosphene-empty-hermes-home/logs
pnpm generate:hermes-live-adapter -- --target /tmp/phosphene-hermes-live-adapter-check --latest-file /tmp/phosphene-hermes-live-adapter-latest.json --hermes-home /tmp/phosphene-empty-hermes-home
mkdir -p /tmp/phosphene-empty-ai-stack
pnpm generate:service-live-adapters -- --target /tmp/phosphene-service-live-adapters-check --latest-file /tmp/phosphene-service-live-adapters-latest.json --ai-stack-root /tmp/phosphene-empty-ai-stack
pnpm lint
pnpm build
```

After Mac mini deploy, verify:

```bash
ssh rAIk.mini 'curl -fsS http://127.0.0.1:5173/node-deploy.json'
ssh rAIk.mini 'curl -fsS http://127.0.0.1:5173/snapshots/current/manifest.json'
ssh rAIk.mini 'curl -fsS http://127.0.0.1:5173/snapshots/canary/latest.json'
ssh rAIk.mini 'curl -fsS http://127.0.0.1:5173/snapshots/live/latest.json'
ssh rAIk.mini 'curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173/'
ssh rAIk.mini 'tail -n 80 /Users/raik./ai-stack/logs/phosphene-update.log | grep -E "phosphene snapshot preserved|phosphene snapshot restored"'
ssh rAIk.mini 'cd /Users/raik./ai-stack/services/phosphene && corepack pnpm publish:snapshot -- --source public/snapshots/current --target /tmp/phosphene-publish-ai-node-check --dry-run'
ssh rAIk.mini '/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh --dry-run /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/hermes-snapshot-2026-06-20-operator-demo'
ssh rAIk.mini '/Users/raik./ai-stack/scripts/generate-phosphene-canary-snapshot.sh'
ssh rAIk.mini '/Users/raik./ai-stack/scripts/generate-phosphene-live-adapter-snapshot.sh'
ssh rAIk.mini '/Users/raik./ai-stack/scripts/generate-phosphene-hermes-live-adapter-snapshot.sh'
ssh rAIk.mini '/Users/raik./ai-stack/scripts/generate-phosphene-service-live-adapters-snapshot.sh'
ssh rAIk.mini 'launchctl print "gui/$(id -u)/com.raik.phosphene-canary" | grep -E "run interval|last exit code|runs"'
```

## Next Hermes Task

Hermes can now be used again for AI-Node-side snapshot-generation tasks through the official CLI one-shot path:

```bash
docker exec hermes /opt/hermes/.venv/bin/hermes -z "<task prompt>" --ignore-rules -t terminal
```

Do not use the direct `run_agent.py` path for this workflow unless it is repaired separately; after credential refresh that path still returned HTTP 403 with empty Provider/Model fields. Keep every Hermes output behind the host-side publisher dry-run before publication.

The current published snapshot is a Hermes-origin v0.1.10 operator-demo pack generated on the AI Node, contract-normalized, validated, published through the AI Node helper, and displayed in the v0.1.10 `Published AI Node Snapshot` panel.

For the next Hermes handoff, use the v0.1.11 contract-check style. It was proven by a host-side publisher dry-run without Codex normalizing the generated pack afterward.

Concrete request document:

```text
docs/product/phosphene-hermes-boundary-output-contract.md
docs/product/phosphene-hermes-snapshot-publisher-v0.1.8-request.md
docs/product/phosphene-hermes-snapshot-v0.1.10-request.md
docs/product/phosphene-hermes-snapshot-v0.1.11-contract-check-request.md
```

Resulting handoff evidence:

```text
docs/product/phosphene-hermes-boundary-handoff-2026-06-19.md
docs/product/phosphene-snapshot-publisher-handoff-2026-06-20.md
docs/product/phosphene-snapshot-operator-demo-handoff-2026-06-20.md
docs/product/phosphene-hermes-contract-check-handoff-2026-06-20.md
docs/product/phosphene-ai-node-canary-handoff-2026-06-20.md
```
