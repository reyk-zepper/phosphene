# Phosphene AI Node Integration Boundary

## Purpose

This document defines how Phosphene connects to the AI Node over time. The boundary exists to keep Phosphene understandable, auditable, and safe while preventing direct coupling to Hermes, AAG, OpenClaw, Sentinel, Gmail, Workspace, or provider internals.

## Current Rule

Hermes works on the AI Node. Hermes does not work on the local development machine and has no local repository or filesystem access here.

When Phosphene work mentions "live integration", it means live or near-live integration with the AI Node, not local Hermes execution.

## Product Boundary

Phosphene is the observer surface. It is not:

- the AI Node runtime
- Hermes
- AAG / Agent Action Gateway
- OpenClaw
- a control plane
- a credential holder
- a direct file browser for private AI Node paths

Phosphene consumes redacted Boundary outputs and renders them as runs, events, details, summaries, and readiness state.

## Current Handoff Paths

AI Node host path:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/
```

AI Node container path:

```text
/opt/data/phosphene-handoffs/
```

Current verified synthetic handoff packs:

```text
boundary-v0.1.2/hermes-synthetic-2026-06-18/
boundary-v0.1.5/hermes-synthetic-2026-06-19/
```

Current fixture copies in this repo:

```text
src/core/traces/handoffs/hermes-synthetic-2026-06-18/
src/core/traces/handoffs/hermes-synthetic-2026-06-19/
```

Current published snapshot seed in this repo:

```text
public/snapshots/current/
```

Served snapshot URL after build/deploy:

```text
/snapshots/current/manifest.json
```

AI Node service path after deploy:

```text
/Users/raik./ai-stack/services/phosphene/dist/snapshots/current/
```

Snapshot publisher CLI after v0.1.8:

```bash
cd /Users/raik./ai-stack/services/phosphene
corepack pnpm publish:snapshot -- --source /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/<pack> --target dist/snapshots/current
```

Host-side publish helper after v0.1.9 infrastructure slice:

```bash
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/<pack>
```

The helper only accepts source directories below:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/
```

It validates through Phosphene's publisher CLI, publishes atomically into `dist/snapshots/current`, verifies the served manifest, and writes audit events to:

```text
/Users/raik./ai-stack/logs/phosphene-snapshot-publish.log
```

AI Node deploy/update script after the deploy persistence slice:

```bash
/Users/raik./ai-stack/scripts/update-phosphene.sh
```

Versioned source copy:

```text
ops/ai-node/update-phosphene.sh
```

The deploy script preserves the current published `dist/snapshots/current/` directory before the Phosphene build and restores it after the build. This keeps the latest validated Hermes-origin snapshot available across normal Phosphene app deploys.

AI Node operational canary after the first adapter-canary slice:

```bash
/Users/raik./ai-stack/scripts/generate-phosphene-canary-snapshot.sh
```

The canary writes a redacted Boundary pack below:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/
```

It observes only sanitized operational markers: Phosphene service HTTP status class, deployed `node-deploy.json`, and the published snapshot manifest marker. It runs the host publisher in `--dry-run` mode by default and does not publish.

The canary also maintains a redacted latest marker:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/latest.json
```

The marker contains only the latest canary pack name, status, manifest file reference, and manifest hash. It must not contain absolute AI Node paths, private URLs, credentials, provider IDs, or service URLs. The scheduled wrapper keeps the newest 48 `ai-node-canary-*` packs by default to prevent unbounded growth.

The browser-facing copy is served from:

```text
/snapshots/canary/latest.json
```

The AI Node wrapper syncs the handoff marker into:

```text
/Users/raik./ai-stack/services/phosphene/dist/snapshots/canary/latest.json
```

The deploy script also syncs the current marker after each Phosphene build, so a normal app deploy does not hide the latest canary state until the next scheduled run.

Phosphene treats a served canary marker as fresh for 30 minutes. Older markers remain visible but are shown as stale operational status. This is a readiness signal for the AI Node canary path, not live Hermes/AAG/OpenClaw/Sentinel telemetry.

Hermes live adapter after the first domain-specific live-adapter slice:

```bash
/Users/raik./ai-stack/scripts/generate-phosphene-hermes-live-adapter-snapshot.sh
```

The Hermes adapter writes a redacted Boundary pack below the shared live-adapter root:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-live/
```

It emits only coarse Hermes operational markers:

- `config.yaml` existence, coarse size band, and modified-time marker
- `cron/jobs.json` existence, parseability, configured job slot count, and enabled marker count
- `gateway_state.json`, `gateway.pid`, and `gateway.lock` marker presence plus a whitelisted public status label
- `logs/agent.log` existence, coarse size band, and modified-time marker

It must not emit Hermes config values, cron prompts, job IDs, log lines, private URLs, credentials, provider payloads, Gmail/Workspace content, host paths, or raw user content. The wrapper updates the same `/snapshots/live/latest.json` served boundary as the generic live adapter.

Multi-service live adapter after v0.1.24:

```bash
/Users/raik./ai-stack/scripts/generate-phosphene-service-live-adapters-snapshot.sh
```

The service adapter writes one redacted Boundary pack below the shared live-adapter root:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-live/
```

It emits separated Boundary trace files for:

- `hermes-live-adapter.boundary.json`
- `aag-live-adapter.boundary.json`
- `openclaw-live-adapter.boundary.json`
- `sentinel-live-adapter.boundary.json`
- `gmail-live-adapter.boundary.json`
- `workspace-live-adapter.boundary.json`

It emits only service marker existence, coarse file classes, modified-time markers, and count-only operational shapes. It must not emit logs, config values, prompts, host paths, private URLs, credentials, provider payloads, Gmail message content, Workspace document content, or raw user content. The wrapper updates the same `/snapshots/live/latest.json` served boundary as the generic and Hermes adapters.

Current v0.1.5 Hermes request document:

```text
docs/product/phosphene-hermes-boundary-v0.1.5-request.md
```

Current v0.1.8 Hermes publisher request document:

```text
docs/product/phosphene-hermes-snapshot-publisher-v0.1.8-request.md
```

Current Hermes Boundary output contract:

```text
docs/product/phosphene-hermes-boundary-output-contract.md
```

## Boundary Bundle Shape

Phosphene expects:

- Boundary trace bundles with `schema_version`, `metadata`, and `events`
- optional `manifest.json`
- optional `validation-report.json`

The browser import path can accept local JSON files. The CLI can validate handoff directories:

```bash
pnpm validate:traces -- src/core/traces/handoffs/hermes-synthetic-2026-06-18
```

The publisher CLI can validate and publish a redacted pack to the served snapshot path:

```bash
pnpm publish:snapshot -- --source public/snapshots/current --target dist/snapshots/current --dry-run
pnpm publish:snapshot -- --source public/snapshots/current --target dist/snapshots/current
```

## Integration Stages

### Stage 1: Static Fixtures

Synthetic/redacted traces live in the repo and prove UI rendering, graph conversion, and validation.

Status: implemented.

### Stage 2: Manual Handoff Intake

Hermes creates a synthetic or redacted handoff pack on the AI Node. The pack is copied or selected locally and imported through Phosphene's intake UI.

Status: implemented for synthetic handoffs.

### Stage 3: Published Redacted Snapshots

An AI Node-side process publishes sanitized Boundary packs into a known export location. Phosphene consumes the exported pack, not private internal runtime state.

Status: implemented for static published snapshots, the executable snapshot publisher contract, and a host-side publish helper. Hermes can generate or stage a validated redacted Boundary pack under the handoff root; the helper performs the controlled host-side publication into the served `dist/snapshots/current/` directory.

### Stage 4: Near-Live Adapter

An AI Node-side adapter streams or periodically writes redacted Boundary events. Phosphene reads only the adapter output. Redaction and normalization happen before Phosphene sees the data.

Status: implemented for the redacted marker-level adapter layer. Phosphene now has a generic redacted near-live adapter path, the first domain-specific Hermes adapter, a multi-service marker adapter, and a redacted side-effect intent adapter:

- the AI Node generator writes `ai-node-live-*` Boundary packs and a redacted `latest.json` marker under the handoff root, normally `/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-live`;
- the deploy helper syncs that marker and pack into served static output at `/snapshots/live/`;
- the browser loader polls `/snapshots/live/latest.json`, validates the marker, loads the referenced manifest/traces/report, and renders the adapter trace as `AI Node Live Adapter`;
- the UI keeps `No raw live telemetry` visible and blocks marker content that contains host paths, private URLs, secrets, email addresses, or provider payload markers.
- the Hermes adapter can publish `hermes-live-adapter.boundary.json` using only coarse Hermes operational markers, with no raw config values, prompts, logs, private URLs, credentials, provider payloads, or user content.
- the service adapter can publish separated redacted marker traces for Hermes, AAG, OpenClaw, Sentinel, Gmail, Workspace, and side-effect intent boundaries in one shared `ai-node-live-*` pack, with no raw service content, host paths, provider payloads, action arguments, Gmail message content, or Workspace document content.
- the side-effect intent adapter emits only category counts, approval-gate marker counts, and held-intent status for AAG-managed side-effect boundaries; it does not read or emit action arguments, recipients, provider payloads, message bodies, document bodies, or execute side effects.

This is still not raw live telemetry or raw side-effect execution observation. The current adapters are intentionally limited to redacted operational markers and side-effect intent counts before attaching more sensitive agent-side systems.

## Security Rules

Boundary outputs must not include:

- secrets
- bearer tokens
- OAuth tokens
- API keys
- private keys
- session cookies
- private URLs
- raw provider IDs
- real email addresses
- customer/provider payloads
- private Workspace/Gmail content

Payload evidence must be represented through redacted proof values such as:

```text
sha256:redacted-workspace-bundle
```

## Hermes Handoff Contract

When Hermes is asked to produce a Phosphene handoff, the request must say:

- run on the AI Node only
- do not read live private data unless the task explicitly permits a redacted live-adapter spike
- emit Boundary bundles only
- emit `manifest.json`
- emit `validation-report.json`
- keep all payloads synthetic or redacted
- use `manifest.files[].file`, not `filename`
- use `trace_id`, not `event_id`
- use `event_type`, not `type`
- set every event `run_id` to the trace `metadata.id`
- use stable event IDs without URL schemes
- use link objects shaped as `{ "label": "...", "href": "trace://..." }`
- omit optional string fields when no value applies; only root `parent_event_id` should use `null`
