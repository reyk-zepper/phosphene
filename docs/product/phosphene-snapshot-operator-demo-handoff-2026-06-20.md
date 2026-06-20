# Phosphene Snapshot Operator Demo Handoff — 2026-06-20

## Summary

The v0.1.10 operator-demo snapshot path was exercised on the AI Node and verified through Phosphene's published snapshot UI.

Hermes was initially re-invoked, but the direct `run_agent.py` path did not generate a pack because the configured provider path returned HTTP 403. A clearly labeled Codex host fallback pack was then generated under the allowed Hermes handoff root, validated, published through the AI Node host helper, and verified in the deployed Phosphene v0.1.10 UI.

Later on 2026-06-20, the Hermes `openai-codex` credential pool was force-refreshed on the AI Node and the official Hermes CLI one-shot path was verified with a harmless probe. Hermes then generated the requested v0.1.10 operator-demo snapshot pack on the AI Node. Codex normalized the generated pack to Phosphene's exact Boundary publisher contract, the host helper validated it, and the Hermes-origin snapshot replaced the fallback in `dist/snapshots/current`.

This is **not live telemetry**. No live Hermes, AAG, OpenClaw, Sentinel, Gmail, Workspace, provider, customer, credential, or private infrastructure data was read. No live side effects were performed.

## Hermes Attempt

Request copied on the AI Node:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/requests/phosphene-snapshot-v010-operator-demo-request.md
```

Versioned source copy:

```text
docs/product/phosphene-hermes-snapshot-v0.1.10-request.md
```

One-shot command shape:

```bash
docker exec hermes sh -lc 'cd /opt/hermes && /opt/hermes/.venv/bin/python run_agent.py --query "Read /opt/data/phosphene-handoffs/requests/phosphene-snapshot-v010-operator-demo-request.md and complete it exactly. Generate the requested synthetic redacted Boundary snapshot pack under /opt/data/phosphene-handoffs/boundary-v0.1.10/hermes-snapshot-2026-06-20-operator-demo/. Do not publish it. Do not read live private data. Report the generated file list." --enabled_toolsets=terminal --max_turns=8'
```

Observed result:

```text
API call failed: PermissionDeniedError [HTTP 403]
Endpoint: https://chatgpt.com/backend-api/codex/
Completed: False
API Calls: 1
```

No files were generated at:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/hermes-snapshot-2026-06-20-operator-demo/
```

## Hermes Provider Recovery

The AI Node Hermes configuration remained selected for:

```text
provider=openai-codex
model=gpt-5.5
```

The local auth state contained a single `openai-codex` credential-pool entry. The pool entry was force-refreshed through Hermes' own pool API and updated:

```text
last_refresh=2026-06-20T13:49:46.978859Z
```

The direct Python runner still returned HTTP 403 with empty Provider/Model fields, so the direct `run_agent.py` path should not be used for this workflow. The official Hermes CLI one-shot path succeeded:

```bash
docker exec hermes /opt/hermes/.venv/bin/hermes -z "Reply exactly: HERMES_PROVIDER_OK" --ignore-rules -t terminal
```

Result:

```text
HERMES_PROVIDER_OK
```

## Hermes-Origin Snapshot Pack

Hermes generated the requested v0.1.10 operator-demo pack at:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/hermes-snapshot-2026-06-20-operator-demo/
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

Hermes generated the content as synthetic/redacted only and reported no live private reads or live side effects. Independent publisher validation initially caught a schema-dialect mismatch:

```text
manifest.files used filename instead of file
events used event_id/type instead of trace_id/event_type
events were missing run_id
links used strings instead of link objects
```

Codex normalized only those contract fields. No trace scenario content was replaced.

Final dry-run:

```bash
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh --dry-run /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/hermes-snapshot-2026-06-20-operator-demo
```

Result:

```text
Validated 6 file(s), 0 failed.
DRY RUN: would publish 7 file(s)
```

Final publish:

```bash
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/hermes-snapshot-2026-06-20-operator-demo
```

Result:

```text
Published 7 file(s) to /Users/raik./ai-stack/services/phosphene/dist/snapshots/current
Served manifest verified: http://127.0.0.1:5173/snapshots/current/manifest.json
Manifest sha256: c70db94577f627e4179918282e0753aaf41fb3a5f3e8e7b51b2a9051d90859ee
```

Served manifest metadata:

```text
source_agent=hermes
classification=synthetic_redacted
created_at=2026-06-20T11:45:12Z
file_count=4
notes=This is a v0.1.10 operator-demo snapshot and not live telemetry. All trace content is synthetic and redacted.
```

## Codex Host Fallback Pack

Fallback source path:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/codex-fallback-2026-06-20-operator-demo/
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

Served manifest metadata:

```text
source_agent=codex_host_fallback_after_hermes_403
classification=synthetic_redacted
file_count=4
notes=v0.1.10 operator-demo snapshot generated by Codex host fallback after Hermes one-shot HTTP 403. Synthetic and redacted only; not live telemetry.
```

Validation report metadata:

```text
overall_status=passed
data_source=synthetic_files_only_no_live_reads_codex_host_fallback
trace_results=4
```

## Validation

CLI validation:

```bash
cd /Users/raik./ai-stack/services/phosphene
corepack pnpm validate:traces -- /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/codex-fallback-2026-06-20-operator-demo
```

Result:

```text
Validated 6 file(s), 0 failed.
```

Publisher dry-run:

```bash
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh --dry-run /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/codex-fallback-2026-06-20-operator-demo
```

Result:

```text
Validated 6 file(s), 0 failed.
DRY RUN: would publish 7 file(s)
```

## Publication

Publish command:

```bash
/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/codex-fallback-2026-06-20-operator-demo
```

Result:

```text
Published 7 file(s) to /Users/raik./ai-stack/services/phosphene/dist/snapshots/current
Served manifest verified: http://127.0.0.1:5173/snapshots/current/manifest.json
Manifest sha256: 79102357ab41b1ca8feca4c3015ad7c0476e328be9ae9260238423a1f7445cb1
```

Audit log:

```text
/Users/raik./ai-stack/logs/phosphene-snapshot-publish.log
```

The audit log contains successful dry-run and publish entries for source:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-v0.1.10/codex-fallback-2026-06-20-operator-demo
```

## Phosphene Verification

Remote HTTP checks:

```text
root_http_code=200
node_deploy.short_commit=4d57728
snapshot_file_count=7
manifest_sha256=79102357ab41b1ca8feca4c3015ad7c0476e328be9ae9260238423a1f7445cb1
```

Browser checks were run through an SSH tunnel to the AI Node service:

```text
127.0.0.1:5174 -> rAIk.mini:127.0.0.1:5173
```

Desktop and mobile Playwright checks found:

```text
Published AI Node Snapshot
Ready
Source: codex_host_fallback_after_hermes_403
Classification: synthetic_redacted
Manifest files: 4
Validation: passed
Telemetry: No live telemetry
Operator note draft approval gate
```

No browser console errors were observed.

Screenshots captured during verification:

```text
/tmp/phosphene-ai-node-v010-desktop.png
/tmp/phosphene-ai-node-v010-mobile.png
```

## Follow-Up

Use the official Hermes CLI one-shot path for future AI Node snapshot-generation tasks. The direct `run_agent.py` probe still returned HTTP 403 with empty Provider/Model fields after credential refresh, while `hermes -z ...` succeeded.

Keep the publisher gate in front of every Hermes-generated pack. The v0.1.10 Hermes pack required field normalization before publication, and the helper correctly blocked it until the Boundary contract passed.

The publication architecture itself is working:

```text
redacted Boundary pack under handoff root
        ↓
host publish helper
        ↓
dist/snapshots/current
        ↓
Phosphene v0.1.10 Published AI Node Snapshot panel
```
