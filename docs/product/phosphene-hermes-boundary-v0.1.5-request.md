# Hermes Task: Phosphene Boundary v0.1.5 Synthetic Handoff

## Context

You are Hermes and you work on the AI Node. You do not have local access to Reyk's Codex workspace, local repository, or local filesystem.

Phosphene v0.1.5 can already render built-in redacted demo traces and import AI-Node-side Boundary handoff packs. The next step is a fresh Hermes-generated synthetic handoff pack that exercises the current Node Observer intake and readiness flow.

This is not a live telemetry task. Do not read live Hermes, AAG, OpenClaw, Sentinel, Gmail, Google Workspace, provider, customer, or credential data.

## Goal

Create a fresh synthetic, fully redacted Phosphene Boundary handoff pack on the AI Node.

The pack must be suitable for Phosphene's local JSON import flow and for the repository command:

```bash
pnpm validate:traces -- src/core/traces/handoffs/<copied-pack-directory>
```

## Output Directory

Write all generated files to this AI Node container path:

```text
/opt/data/phosphene-handoffs/boundary-v0.1.5/hermes-synthetic-2026-06-19/
```

Equivalent AI Node host path:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.5/hermes-synthetic-2026-06-19/
```

Create the directory if it does not exist.

## Hard Boundaries

- Work only on the AI Node.
- Do not assume access to Reyk's local Phosphene repository.
- Do not read live private data.
- Do not execute live side effects.
- Do not open ports.
- Do not deploy.
- Do not commit to any repository.
- Do not emit secrets, tokens, private URLs, raw provider IDs, real email addresses, real message bodies, real document content, real calendar data, customer data, provider payloads, or private infrastructure details.
- Use only synthetic or generically redacted content.

## Boundary Contract

Important: v0.1.5 is the Phosphene app/product slice. The Boundary schema version is still:

```text
phosphene.boundary.v0.1.2
```

Each trace file must be one JSON object:

```json
{
  "schema_version": "phosphene.boundary.v0.1.2",
  "metadata": {
    "id": "stable-run-id",
    "title": "Human-readable title",
    "subtitle": "Optional subtitle",
    "status": "succeeded"
  },
  "events": []
}
```

Required `metadata` fields:

- `id`
- `title`
- `status`

Allowed `metadata.status` values:

```text
queued, running, needs_approval, approved, denied, succeeded, failed, recovered
```

Every event must use these fields where applicable:

- `trace_id`
- `run_id`
- `source`
- `event_type`
- `actor`
- `tool`
- `decision`
- `risk`
- `status`
- `timestamp`
- `summary`
- `redacted_payload_hash`
- `parent_event_id`
- `links`

Allowed `source` values:

```text
hermes, openclaw, aag, sentinel
```

Allowed `event_type` values:

```text
run.started
agent.plan
tool.requested
tool.executed
aag.decision
approval.required
worker.started
worker.completed
health.check
sentinel.alert
sentinel.recovery
run.completed
```

Allowed `risk` values:

```text
low, medium, high
```

Allowed `status` values:

```text
queued, running, needs_approval, approved, denied, succeeded, failed, recovered
```

Event requirements:

- Use one `run_id` per trace file.
- Use exactly one root event per trace file.
- The root event must have `"parent_event_id": null`.
- Every non-root `parent_event_id` must reference an existing `trace_id` in the same file.
- Use stable event IDs without URL schemes.
- Use ISO timestamps.
- Keep summaries short, human-readable, and redacted.
- Omit optional string fields when no value applies. Do not write `null` for `actor`, `tool`, `decision`, or `redacted_payload_hash`.
- Use `redacted_payload_hash` values shaped like `sha256:redacted-...`.
- If `links` are present, each link must be shaped as:

```json
{ "label": "Redacted audit reference", "href": "trace://synthetic-reference" }
```

- Do not use HTTP URLs in generated artifacts. Use `trace://...` only.

## Required Trace Files

Generate exactly these four trace bundles:

1. `hermes-aag-gmail-draft.synthetic.json`
   - Hermes starts and plans a synthetic draft action.
   - AAG evaluates the action.
   - AAG requires approval before side effects.
   - No message body, recipient, sender, thread ID, draft ID, or provider ID.
   - Terminal status: `needs_approval`.

2. `hermes-openclaw-worker.synthetic.json`
   - Hermes delegates bounded work to OpenClaw.
   - OpenClaw is represented as a worker, not as the primary agent.
   - The worker returns only a redacted result summary.
   - Terminal status: `succeeded`.

3. `aag-workspace-bundle.synthetic.json`
   - AAG evaluates a synthetic Google Workspace action bundle.
   - Multiple possible side effects are grouped and held at the gate.
   - The bundle remains pending approval.
   - No document names, calendar entries, user addresses, Drive IDs, or provider IDs.
   - Terminal status: `needs_approval`.

4. `sentinel-recovery.synthetic.json`
   - Sentinel detects a synthetic health-gate failure.
   - Sentinel starts recovery.
   - Recovery completes and the run closes.
   - No hostnames, private URLs, internal IPs, or private service names.
   - Terminal status: `recovered`.

## Required Support Files

Also generate:

- `manifest.json`
- `validation-report.json`
- `README.md`

### manifest.json

The manifest must include:

- `schema_version`: `phosphene.boundary.v0.1.2`
- `created_at`
- `source_agent`: `hermes`
- `data_classification`: `synthetic_redacted`
- `files`: all four trace files, each with `file` and `description`
- `import_contract`: `phosphene.boundary.v0.1.2-importable`
- optional `notes`

### validation-report.json

The validation report must include:

- `schema_version`: `phosphene.boundary.v0.1.2`
- `created_at`
- `overall_status`: `passed` only if all checks pass
- `data_source`: `synthetic_files_only_no_live_reads`
- `checks`
- `trace_results`
- `support_file_results`

Use these checks:

- `json_parse_all_trace_files`
- `schema_version_all_trace_files`
- `bundle_shape_all_trace_files`
- `one_root_event_per_trace_file`
- `parent_event_references_valid`
- `allowed_enum_values`
- `links_object_shape`
- `link_hrefs_trace_scheme_only`
- `stable_event_ids_without_url_schema`
- `forbidden_patterns_absent`

### README.md

The README must briefly state:

- These files are synthetic and redacted.
- They are not live telemetry.
- They are intended for Phosphene Node Observer import testing.
- Import the four `*.synthetic.json` trace bundles plus `manifest.json` and `validation-report.json`.

Keep the README free of private paths except the output path above.

## Self-Validation Before Final Response

Before responding, verify at least:

- all required files exist
- all JSON files parse
- every trace uses `schema_version: "phosphene.boundary.v0.1.2"`
- every trace has one root event
- all parent references resolve
- all enum values are in the allowed sets above
- all `links` entries are objects with `label` and `href`
- all link hrefs use `trace://`
- no `trace_id` or `parent_event_id` contains a URL scheme
- no generated artifact contains emails, live URLs, private URLs, private key blocks, bearer-token-shaped strings, `sk-...`-shaped keys, raw provider IDs like `openai/...`, `anthropic/...`, `google/...`, `gpt/...`, `claude/...`, or customer/provider payloads

## Final Response

Respond with only:

- output directory, both container and host path
- generated file list
- validation short status
- confirmation that no live data was read and no live side effects were executed
