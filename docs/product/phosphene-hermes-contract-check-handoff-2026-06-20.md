# Phosphene Hermes Contract Check Handoff - 2026-06-20

## Summary

Hermes generated a fresh AI-Node-side synthetic Boundary snapshot pack using the stricter v0.1.11 contract-check request.

This check proves that Hermes can now emit the exact Phosphene publisher dialect without Codex normalizing contract fields afterward.

This is **not live telemetry**. No live Hermes, AAG, OpenClaw, Sentinel, Gmail, Workspace, provider, customer, credential, or private infrastructure data was read. No live side effects were performed.

## Request

Versioned source request:

```text
docs/product/phosphene-hermes-snapshot-v0.1.11-contract-check-request.md
```

AI Node request copy:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/requests/phosphene-snapshot-v011-contract-check-request.md
```

Reusable output contract:

```text
docs/product/phosphene-hermes-boundary-output-contract.md
```

Hermes command shape:

```bash
docker exec hermes sh -lc 'prompt="$(cat /opt/data/phosphene-handoffs/requests/phosphene-snapshot-v011-contract-check-request.md)"; /opt/hermes/.venv/bin/hermes -z "$prompt" --ignore-rules -t terminal'
```

## Output

Container path:

```text
/opt/data/phosphene-handoffs/boundary-v0.1.11/hermes-snapshot-2026-06-20-contract-check/
```

Host path:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.11/hermes-snapshot-2026-06-20-contract-check/
```

Generated files:

```text
README.md
aag-workspace-bundle.synthetic.json
hermes-aag-gmail-draft.synthetic.json
hermes-openclaw-worker.synthetic.json
manifest.json
sentinel-recovery.synthetic.json
validation-report.json
```

Manifest metadata:

```text
schema_version=phosphene.boundary.v0.1.2
source_agent=hermes
data_classification=synthetic_redacted
created_at=2026-06-20T14:10:00Z
file_count=4
```

Validation-report metadata:

```text
overall_status=passed
data_source=synthetic_files_only_no_live_reads
trace_results=4
```

## Contract Result

Hermes generated the required contract shapes directly:

```text
manifest.files uses file, not filename
events use trace_id, run_id, and event_type
events do not use event_id or type
links are objects with label and href
link href values use trace://
```

No Codex normalization was applied to the generated pack before validation.

## Host Publisher Dry-Run

Command:

```bash
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh --dry-run /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.11/hermes-snapshot-2026-06-20-contract-check
```

Result:

```text
PASS ../../data/hermes/home/phosphene-handoffs/boundary-v0.1.11/hermes-snapshot-2026-06-20-contract-check/aag-workspace-bundle.synthetic.json
PASS ../../data/hermes/home/phosphene-handoffs/boundary-v0.1.11/hermes-snapshot-2026-06-20-contract-check/hermes-aag-gmail-draft.synthetic.json
PASS ../../data/hermes/home/phosphene-handoffs/boundary-v0.1.11/hermes-snapshot-2026-06-20-contract-check/hermes-openclaw-worker.synthetic.json
PASS ../../data/hermes/home/phosphene-handoffs/boundary-v0.1.11/hermes-snapshot-2026-06-20-contract-check/manifest.json (manifest)
PASS ../../data/hermes/home/phosphene-handoffs/boundary-v0.1.11/hermes-snapshot-2026-06-20-contract-check/sentinel-recovery.synthetic.json
PASS ../../data/hermes/home/phosphene-handoffs/boundary-v0.1.11/hermes-snapshot-2026-06-20-contract-check/validation-report.json (validation_report)
Validated 6 file(s), 0 failed.
DRY RUN: would publish 7 file(s)
```

The dry-run did not publish or replace the current served snapshot.

## Current Use

Use this request style for the next Hermes-generated Phosphene snapshot or adapter-canary handoff.

Keep the host publisher dry-run as the gate before any publication.
