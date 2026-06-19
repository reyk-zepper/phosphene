# Phosphene Node Observer Demo

## Demo Goal

Show that Phosphene can explain AI-Node behavior from redacted Boundary traces without claiming live telemetry.

## Current Build

- App version: `v0.1.5`
- Deployed service: Phosphene on the Mac mini AI Node
- Mode to show: `Node Observer`
- Data class: synthetic/redacted fixtures and locally imported Boundary JSON

## What Works Today

- Switch between `Reasoning Lab` and `Node Observer`.
- Select built-in redacted AI-node demo traces.
- Select Hermes synthetic handoff traces generated on the AI Node.
- Import multiple Boundary JSON files at once.
- Import `manifest.json` and `validation-report.json` as support context.
- See accepted traces, blocked files, and failed checks in the intake table.
- Inspect run summary, event graph, and detail panel.
- See readiness state:
  - Boundary Contract: ready
  - Handoff Intake: ready or partial
  - AI Node Live Adapter: not connected

## What To Say

Use this framing:

```text
Phosphene visualizes redacted AI-node Boundary traces. It can ingest Hermes-generated handoff packs, validate them locally, and render the run as an event graph with risk, decision, status, and recovery context.
```

Use this when explaining the current limitation:

```text
This is not live telemetry yet. The live adapter will run on the AI Node and publish redacted Boundary output for Phosphene to observe.
```

## What Not To Claim

Do not claim:

- Phosphene is observing live Hermes runs today.
- Hermes runs locally on the development machine.
- The browser reads private AI Node filesystem paths.
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
8. Point out the readiness strip and the `AI Node Live Adapter` status.

## Verification Before Demo

Run locally before claiming the demo build is healthy:

```bash
pnpm test -- --run
pnpm validate:traces -- src/core/traces/handoffs/hermes-synthetic-2026-06-18
pnpm lint
pnpm build
```

After Mac mini deploy, verify:

```bash
ssh rAIk.mini 'curl -fsS http://127.0.0.1:5173/node-deploy.json'
ssh rAIk.mini 'curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5173/'
```

## Next Hermes Task

After this demo readiness slice, Hermes should be asked to generate a fresh AI-Node-side handoff pack using the current Boundary contract and v0.1.4 intake shape. The task should remain synthetic/redacted unless a later live-adapter spike is explicitly approved.

