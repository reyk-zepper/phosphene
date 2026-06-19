# Hermes Task: Phosphene Snapshot Publisher v0.1.8

## Context

You are Hermes and you work on the AI Node. You do not have local access to Reyk's Codex workspace, local repository, or local filesystem.

Phosphene v0.1.8 can load a published redacted snapshot from `/snapshots/current/` and now includes an executable publisher CLI in the deployed Phosphene service repository.

This is not a live telemetry task. Do not read live Hermes, AAG, OpenClaw, Sentinel, Gmail, Google Workspace, provider, customer, or credential data unless a later task explicitly approves a redacted live-adapter spike.

## Goal

Create a fresh synthetic, fully redacted Phosphene Boundary pack on the AI Node and publish it into Phosphene's served snapshot path through the v0.1.8 publisher CLI.

## Source Directory

Write the generated source pack here:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-19/
```

Create the directory if it does not exist.

## Publish Target

Publish into the deployed Phosphene service path:

```text
/Users/raik./ai-stack/services/phosphene/dist/snapshots/current/
```

Use the Phosphene service repository as the working directory:

```bash
cd /Users/raik./ai-stack/services/phosphene
```

## Required Commands

First validate without writing:

```bash
corepack pnpm publish:snapshot -- --source /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-19 --target dist/snapshots/current --dry-run
```

Only if the dry run passes, publish:

```bash
corepack pnpm publish:snapshot -- --source /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.8/hermes-snapshot-2026-06-19 --target dist/snapshots/current
```

Then verify the served manifest:

```bash
curl -fsS http://127.0.0.1:5173/snapshots/current/manifest.json
```

## Required Files

Generate exactly these four trace bundles:

- `hermes-aag-gmail-draft.synthetic.json`
- `hermes-openclaw-worker.synthetic.json`
- `aag-workspace-bundle.synthetic.json`
- `sentinel-recovery.synthetic.json`

Also generate:

- `manifest.json`
- `validation-report.json`
- `README.md`

The manifest must list all four trace bundle filenames in `files`.

## Boundary Contract

Use Boundary schema version:

```text
phosphene.boundary.v0.1.2
```

Allowed sources:

```text
hermes, openclaw, aag, sentinel
```

Allowed event types:

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

Allowed statuses:

```text
queued, running, needs_approval, approved, denied, succeeded, failed, recovered
```

Allowed risks:

```text
low, medium, high
```

## Hard Boundaries

- Work only on the AI Node.
- Do not assume access to Reyk's local machine.
- Do not deploy Phosphene.
- Do not commit to any repository.
- Do not open ports.
- Do not execute live side effects.
- Do not read or emit secrets, bearer tokens, OAuth tokens, API keys, private keys, session cookies, private URLs, raw provider IDs, real email addresses, real message bodies, real document content, real calendar data, customer data, provider payloads, or private infrastructure details.
- Use only synthetic or generically redacted content.
- Use `trace://...` links only; do not use HTTP URLs in generated artifacts.
- Omit optional string fields when no value applies. Do not write `null` for `actor`, `tool`, `decision`, or `redacted_payload_hash`.
- Use exactly one root event per trace file with `"parent_event_id": null`.
- Every non-root `parent_event_id` must reference an event in the same file.

## Completion Report

Report back:

- source directory path
- publisher dry-run result
- publisher publish result
- served manifest verification result
- confirmation that no live private data or side effects were used
