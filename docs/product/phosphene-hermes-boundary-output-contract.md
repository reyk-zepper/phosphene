# Hermes Boundary Output Contract

## Purpose

This is the exact output contract Hermes must follow when generating Phosphene Boundary packs on the AI Node.

The product contract is intentionally stricter than a general trace idea. A pack that looks semantically correct but uses the wrong JSON field names must be treated as invalid until normalized or regenerated.

## Runtime Boundary

Hermes works on the AI Node only.

Container handoff root:

```text
/opt/data/phosphene-handoffs/
```

Host handoff root:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/
```

Phosphene consumes published redacted Boundary outputs. It must not read live Hermes, AAG, OpenClaw, Sentinel, Gmail, Workspace, provider, customer, credential, or private infrastructure data.

## Required Pack Files

Every snapshot pack must contain:

```text
manifest.json
validation-report.json
README.md
```

Every trace listed by `manifest.json` must exist in the same pack directory.

## Manifest Shape

`manifest.json` must use `file`, not `filename`.

```json
{
  "schema_version": "phosphene.boundary.v0.1.2",
  "created_at": "2026-06-20T14:10:00Z",
  "source_agent": "hermes",
  "data_classification": "synthetic_redacted",
  "files": [
    {
      "file": "hermes-aag-gmail-draft.synthetic.json",
      "description": "Synthetic/redacted Gmail draft approval trace."
    }
  ],
  "import_contract": "phosphene.boundary.v0.1.2-importable",
  "notes": "Synthetic/redacted snapshot only; not live telemetry."
}
```

Forbidden manifest keys:

```text
filename
path
url
href
absolute_path
```

## Trace Bundle Shape

Every trace bundle must follow:

```json
{
  "schema_version": "phosphene.boundary.v0.1.2",
  "metadata": {
    "id": "run-hermes-contract-check-gmail-20260620",
    "title": "Synthetic Gmail draft approval gate",
    "subtitle": "Redacted contract-check trace with no live data",
    "status": "needs_approval"
  },
  "events": [
    {
      "trace_id": "evt-gmail-root",
      "run_id": "run-hermes-contract-check-gmail-20260620",
      "source": "hermes",
      "event_type": "run.started",
      "actor": "hermes",
      "risk": "medium",
      "status": "running",
      "timestamp": "2026-06-20T14:10:00Z",
      "summary": "Synthetic/redacted run started; no live mailbox or message content was read.",
      "redacted_payload_hash": "sha256:redacted-gmail-root",
      "parent_event_id": null,
      "links": [
        {
          "label": "Redacted audit reference",
          "href": "trace://contract-check/gmail/root"
        }
      ]
    }
  ]
}
```

Required event fields:

```text
trace_id
run_id
source
event_type
status
timestamp
summary
```

Recommended event fields:

```text
actor
risk
redacted_payload_hash
parent_event_id
links
tool
decision
```

Forbidden event keys:

```text
event_id
type
filename
payload
raw_payload
url
href
provider_id
email
```

## IDs And Parent References

- `metadata.id` is the run ID for the trace bundle.
- Every event's `run_id` must equal `metadata.id`.
- Every event's `trace_id` must be unique inside the file.
- There must be exactly one root event where `parent_event_id` is `null`.
- Every non-root `parent_event_id` must reference another event's `trace_id` in the same file.
- Do not reference `event_id`; Phosphene does not use that field.

## Link Shape

`links` must be omitted or be an array of objects:

```json
[
  {
    "label": "Redacted audit reference",
    "href": "trace://contract-check/gmail/approval"
  }
]
```

Do not emit link strings:

```json
["trace://contract-check/gmail/approval"]
```

Do not emit HTTP URLs.

## Allowed Values

Allowed `source` values:

```text
hermes
openclaw
aag
sentinel
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

Allowed `status` values:

```text
queued
running
needs_approval
approved
denied
succeeded
failed
recovered
```

Allowed `risk` values:

```text
low
medium
high
```

## Redaction Rules

Packs must not include:

- secrets
- bearer tokens
- OAuth tokens
- API keys
- private keys
- session cookies
- private URLs
- raw provider IDs
- real email addresses
- real message bodies
- real document content
- real calendar data
- customer data
- provider payloads
- private infrastructure details

Use redacted proof values only:

```text
sha256:redacted-...
```

## Validation Gate

The AI Node host publication helper is the authority for publication:

```bash
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh --dry-run /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/<pack>
```

Expected result before publish:

```text
Validated 6 file(s), 0 failed.
DRY RUN: would publish 7 file(s)
```

If dry-run fails, do not publish. Fix the pack or regenerate it.

## Known Failure From v0.1.10

Hermes previously generated a semantically useful pack that failed the publisher contract because it used:

```text
manifest.files[].filename
events[].event_id
events[].type
links as string arrays
missing events[].run_id
```

Future Hermes requests must explicitly forbid those shapes.
