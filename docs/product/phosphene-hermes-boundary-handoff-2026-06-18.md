# Hermes Boundary Trace Handoff — 2026-06-18

## Context

Hermes generated the first AI-node-side synthetic Boundary trace handoff for Phosphene after the Node Observer v0.1.2 contract was deployed.

This handoff is **not live telemetry**. Hermes was instructed to avoid reading live Hermes/AAG/OpenClaw/Gmail/Workspace/Sentinel data, secrets, OAuth files, private URLs, raw provider IDs, and customer/provider payloads.

## AI Node Location

Host path:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.2/hermes-synthetic-2026-06-18/
```

Container path:

```text
/opt/data/phosphene-handoffs/boundary-v0.1.2/hermes-synthetic-2026-06-18/
```

## Generated Files

- `hermes-aag-gmail-draft.synthetic.json`
- `hermes-openclaw-worker.synthetic.json`
- `aag-workspace-bundle.synthetic.json`
- `sentinel-recovery.synthetic.json`
- `manifest.json`
- `validation-report.json`
- `README.md`

## Independent Verification

Codex independently verified the handoff after Hermes repaired the first pass:

- 4 Boundary JSON bundles present.
- All bundles use `schema_version: "phosphene.boundary.v0.1.2"`.
- Exactly one root event per bundle.
- All `parent_event_id` references resolve to existing `trace_id` values.
- `trace_id` and `parent_event_id` use stable event IDs without URL schemes.
- `links` uses Phosphene-compatible object shape: `{ "label": "...", "href": "trace://..." }`.
- Source, event type, status, and risk values match Phosphene's allowed enum sets.
- Redaction scan found no email addresses, bearer/OAuth/API-key keywords, private URLs, private key blocks, or raw provider IDs.
- Browser QA imported all four Hermes-generated bundles through Phosphene's local JSON upload path.

## Result

The handoff is suitable as a synthetic AI-node-side test fixture set for Phosphene Node Observer. It should remain outside live-agent claims until a future adapter generates redacted traces from real runs through the same Boundary contract.
