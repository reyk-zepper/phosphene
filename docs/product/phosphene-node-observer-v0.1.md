# Phosphene Node Observer v0.1 Foundation

## Product intent

Phosphene v0.1 introduces **Node Observer** as a second product mode next to the existing **Reasoning Lab**. The intent is to make AI-node runs understandable as visual, navigable traces: what started a run, which systems participated, which decisions were gated, what risk level was assigned, and how failures or recoveries became visible.

This release is intentionally a foundation slice. It renders **synthetic, redacted demo traces** through a stable JSON import / adapter boundary. It does **not** observe live Hermes, AAG, OpenClaw, Sentinel, Gmail, or Google Workspace traffic.

## Scope / non-scope

### Scope

- Separate product language for Reasoning Lab and Node Observer.
- Redacted AI-node demo traces rendered as graph nodes.
- A Boundary JSON format that is independent from Hermes/AAG/OpenClaw internal structures.
- A TypeScript adapter that normalizes Boundary JSON into the existing graph model.
- Demo scenarios for approval, delegation, workspace bundle, and recovery flows.
- Tests for trace integrity, adapter conversion, and redaction hygiene.

### Non-scope

- No live integration with Hermes, AAG, OpenClaw, Gmail, Google Workspace, or Sentinel.
- No realtime streaming architecture.
- No direct coupling to private AI-node internals.
- No public exposure, port changes, provider credentials, OAuth artifacts, or customer data.
- No claim that Phosphene is currently observing live agents.

## Modes

### Reasoning Lab

Reasoning Lab remains the mode for exploring model reasoning as a graph. It is about reasoning structure: hypotheses, evidence, analysis, revision, conclusions, and decisions.

### Node Observer

Node Observer is the mode for inspecting AI-node run traces. In v0.1 it renders **redacted demo traces only**. It explains runs, events, systems, status, risk, decisions, and recovery without exposing live telemetry or sensitive payloads.

## Trace schema

The external Boundary bundle format is versioned with `schema_version: "phosphene.boundary.v0.1.2"` and contains `metadata` plus an `events` array. The canonical machine-readable schema lives in `docs/product/phosphene-boundary-trace.schema.json`.

Boundary event fields use snake_case:

| Field | Meaning |
|---|---|
| `trace_id` | Unique event id inside the imported trace bundle. Parent references point to this value. |
| `run_id` | Run identifier used to group one scenario. |
| `source` | Origin system: `hermes`, `openclaw`, `aag`, or `sentinel`. |
| `event_type` | Event classification such as `run.started`, `agent.plan`, `tool.requested`, `aag.decision`, `sentinel.recovery`. |
| `actor` | Redacted actor label, never a private account id or provider id. |
| `tool` | Redacted tool/action name when relevant. |
| `decision` | Decision outcome such as `require_approval`, `allow_demo`, `recover`. |
| `risk` | `low`, `medium`, or `high` when risk is meaningful. |
| `status` | Lifecycle status: `queued`, `running`, `needs_approval`, `approved`, `denied`, `succeeded`, `failed`, or `recovered`. |
| `timestamp` | ISO timestamp for ordering. |
| `summary` | Short user-visible summary. |
| `redacted_payload_hash` | Optional redacted evidence hash, e.g. `sha256:redacted-gmail-draft`. |
| `parent_event_id` | Optional parent event reference by `trace_id`; absent/null means root event. |
| `links` | Optional redacted/help links; no private URLs. |

The adapter converts this Boundary format into the current internal `NodeTrace`/`ReasoningGraph` model. The UI should depend on this normalized model, not on Hermes/AAG/OpenClaw-specific objects.

## Demo traces

v0.1 ships four built-in synthetic scenarios:

1. **Hermes -> AAG -> Gmail Draft** — a draft is prepared and held behind approval; no email address or message body is present.
2. **Hermes -> OpenClaw Worker** — Hermes delegates bounded work through a worker boundary and receives a redacted result.
3. **AAG Google Workspace Bundle** — a multi-action Workspace bundle is grouped, risk-classified, and held for approval.
4. **Sentinel Failure / Recovery** — a health failure becomes visible and later records a recovery event.

All demo data is synthetic/redacted. Payload proof is represented only by values like `sha256:redacted-...`.

## Trace intake and handoff gallery

v0.1.3 adds a repeatable intake path for Boundary JSON fixtures:

- Built-in demo traces and Hermes synthetic handoffs are shown as separate Node Observer groups.
- Hermes handoff traces are stored as repo fixtures under `src/core/traces/handoffs/hermes-synthetic-2026-06-18/`.
- The browser import path returns visible validation checks for JSON parsing, schema version, shape, enum values, graph references, and redaction.
- The CLI validator can be run with `pnpm validate:traces -- <files-or-directories>`.

The Hermes handoff gallery is still **synthetic fixture data**, not live telemetry. It exists to prove that AI-node-side workers can generate Phosphene-compatible Boundary bundles without coupling the UI to live Hermes internals.

v0.1.4 hardens this intake path:

- Multiple local JSON files can be selected at once.
- Valid trace bundles are imported even when another selected file is blocked.
- `manifest.json` and `validation-report.json` are parsed as support context, not graph traces.
- The Node Observer UI shows a per-file intake table with file kind, status, and failed checks/errors.
- The CLI validator accepts directories that contain trace bundles plus manifest/report support files.

v0.1.5 adds demo readiness and context hardening:

- `CLAUDE.md` defines Phosphene as Reasoning Lab plus Node Observer.
- Hermes is documented as AI Node-only; it has no local development-machine access.
- `docs/product/phosphene-ai-node-integration-boundary.md` defines manual handoff, snapshot, and future adapter stages.
- `docs/demo/phosphene-node-observer-demo.md` defines what can be shown and what must not be claimed.
- Node Observer shows a readiness strip for Boundary Contract, Handoff Intake, and AI Node Live Adapter status.

v0.1.7 adds the first published redacted snapshot path:

- Phosphene fetches `/snapshots/current/manifest.json` from its served static boundary.
- Valid snapshot traces appear as `Published AI Node Snapshot`.
- Snapshot readiness is separate from manual handoff intake and from the still-disconnected live adapter.
- The published snapshot is a sanitized Boundary pack, not streaming or live telemetry.

## UI layout

- Header mode switch distinguishes Reasoning Lab from Node Observer.
- Node Observer Bar selects among grouped built-in demo traces, Hermes synthetic handoffs, and local imports.
- Node Observer Bar explicitly labels handoff traces as synthetic handoffs and keeps the no-live-telemetry status visible.
- Intake results appear as a compact table below the run summary after local JSON upload.
- Readiness status appears below the run summary and keeps the live adapter visibly disconnected until a real AI Node adapter exists.
- Run Summary Panel shows outcome, highest risk, participating systems, approvals, failures/recovery, and duration before the user clicks a node.
- Graph canvas renders event order and parent/child relationships.
- Detail Panel groups event fields into Identity, Action, Gate, and Evidence so actor, source, tool, decision, risk, status, redacted payload hash, and links are easier to scan.

## Security/redaction rules

Demo/test data must not contain:

- Secrets, API keys, OAuth tokens, bearer tokens, session cookies, or private keys.
- Real email addresses or customer/provider identifiers.
- Private URLs, localhost URLs, RFC1918 network URLs, or `.local` hosts.
- Raw provider model ids or internal endpoint ids.
- Unredacted payloads, message bodies, documents, calendars, or customer data.

Allowed proof values should be synthetic and visibly redacted, e.g. `sha256:redacted-workspace-bundle`.

## Acceptance criteria

- Product doc exists and states clearly that v0.1 uses redacted demo traces only.
- README mentions both Reasoning Lab and Node Observer.
- Four demo traces are available through Boundary JSON.
- Adapter converts Boundary JSON into graph-renderable data.
- v0.1.1 allows a local Boundary JSON upload, validates schema/redaction rules in the browser, and renders the imported trace without sending data to a server.
- v0.1.2 ships versioned Boundary bundles with `schema_version: "phosphene.boundary.v0.1.2"` and a JSON Schema contract document.
- v0.1.2 exposes run-level summaries before node click-through and groups event details by purpose.
- v0.1.3 stores four verified Hermes synthetic handoff fixtures as a separate gallery group.
- v0.1.3 shows structured validation checks for accepted and blocked Boundary JSON imports.
- v0.1.3 provides `pnpm validate:traces -- <files-or-directories>` for repeatable fixture intake checks.
- v0.1.4 supports multi-file local intake with partial success: valid traces import while invalid files remain blocked.
- v0.1.4 parses Hermes `manifest.json` and `validation-report.json` as support context and displays them in intake results.
- v0.1.4 CLI validation accepts handoff directories containing trace bundles plus manifest/report support files.
- v0.1.5 documents the AI Node integration boundary and Hermes AI Node-only rule.
- v0.1.5 provides a demo document with safe wording and non-claims.
- v0.1.5 exposes Observer readiness without claiming live telemetry.
- v0.1.7 loads published redacted snapshots from `/snapshots/current/` while keeping the live adapter disconnected.
- Tests validate ids, root events, parent references, allowed enum values, redaction hygiene, and adapter conversion.
- Node Observer Bar and Detail Panel expose the redacted-demo nature and relevant event fields.
- Local verification runs Vitest, ESLint, TypeScript build, and production build before any deployment claim.

## Implementation steps

1. Define Boundary JSON event types and allowed enum sets.
2. Store the four redacted demo scenarios as JSON fixtures.
3. Normalize fixtures through an adapter into `NodeTrace`.
4. Render existing graphs from normalized traces using `traceToGraph`.
5. Extend tests for schema/integrity/redaction/adapter behavior.
6. Add minimal UI copy for redacted demo traces and detail metadata.
7. Update README status/architecture language for the two modes.
8. Run local verification; deploy only after green local checks and read-back verification.
