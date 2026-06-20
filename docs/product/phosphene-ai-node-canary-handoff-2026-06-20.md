# Phosphene AI Node Canary Handoff - 2026-06-20

## Summary

Phosphene now has a first AI-Node-side operational canary that writes a redacted Boundary pack from real service health markers.

This is **not live agent telemetry**. It does not read provider payloads, credentials, Gmail, Workspace, customer data, real message bodies, real document content, or private infrastructure details.

The canary observes only sanitized operational markers:

- Phosphene service HTTP status class
- deployed `node-deploy.json` marker
- published snapshot manifest marker

The canary output is a Boundary pack under the Hermes handoff root. Publication remains a separate explicit step through the existing snapshot publisher.

## Source Files

Generator:

```text
scripts/generate-ai-node-canary-snapshot.mjs
```

AI Node wrapper source:

```text
ops/ai-node/generate-phosphene-canary-snapshot.sh
```

LaunchAgent installer source:

```text
ops/ai-node/install-phosphene-canary-launchagent.sh
```

Installed AI Node wrapper:

```text
/Users/raik./ai-stack/scripts/generate-phosphene-canary-snapshot.sh
```

Installed LaunchAgent:

```text
/Users/raik./Library/LaunchAgents/com.raik.phosphene-canary.plist
```

Package script:

```bash
pnpm generate:canary -- --target <pack-dir>
```

## AI Node Command

Default safe run:

```bash
/Users/raik./ai-stack/scripts/generate-phosphene-canary-snapshot.sh
```

The wrapper:

1. generates a pack below `/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/`
2. runs `/Users/raik./ai-stack/scripts/publish-phosphene-snapshot.sh --dry-run <pack>`
3. updates `/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/latest.json`
4. keeps the newest 48 `ai-node-canary-*` packs by default
5. does not publish
6. does not deploy

To generate without the publisher dry-run:

```bash
/Users/raik./ai-stack/scripts/generate-phosphene-canary-snapshot.sh --no-dry-run
```

## Verified Run

Generated pack:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/ai-node-canary-20260620T215521Z
```

Generated files:

```text
README.md
ai-node-canary-health.boundary.json
manifest.json
validation-report.json
```

Generator result:

```text
Generated AI Node canary snapshot pack: /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/ai-node-canary-20260620T215521Z
Canary status: succeeded
```

Host publisher dry-run:

```text
PASS ../../data/hermes/home/phosphene-handoffs/boundary-canary/ai-node-canary-20260620T215521Z/ai-node-canary-health.boundary.json
PASS ../../data/hermes/home/phosphene-handoffs/boundary-canary/ai-node-canary-20260620T215521Z/manifest.json (manifest)
PASS ../../data/hermes/home/phosphene-handoffs/boundary-canary/ai-node-canary-20260620T215521Z/validation-report.json (validation_report)
Validated 3 file(s), 0 failed.
DRY RUN: would publish 4 file(s)
```

No files were published by this run.

## Scheduled Canary

The canary is installed as a macOS LaunchAgent:

```text
label=com.raik.phosphene-canary
interval_seconds=900
run_at_load=false
program=/bin/bash /Users/raik./ai-stack/scripts/generate-phosphene-canary-snapshot.sh
stdout=/Users/raik./ai-stack/logs/phosphene-canary.log
stderr=/Users/raik./ai-stack/logs/phosphene-canary.log
latest_marker=/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/latest.json
retention_count=48
```

Install command:

```bash
/Users/raik./ai-stack/services/phosphene/ops/ai-node/install-phosphene-canary-launchagent.sh
```

LaunchAgent verification:

```text
state=not running
runs=1
last_exit_code=0
run_interval=900 seconds
```

First scheduled/kickstarted run:

```text
pack=/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/ai-node-canary-20260620T222458Z
status=succeeded
publisher_dry_run=Validated 3 file(s), 0 failed; DRY RUN: would publish 4 file(s)
redaction_grep=passed
```

The scheduled run did not publish and did not replace the served snapshot.

## Latest Marker

Default marker:

```text
/Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/boundary-canary/latest.json
```

The marker is intended as the future stable read point for Phosphene UI status work. It contains only redacted metadata:

```text
schema_version
updated_at
source_agent
data_classification
latest_pack
canary_status
manifest_file
manifest_sha256
retention_count
```

It must not contain absolute AI Node paths, private URLs, service URLs, credentials, raw provider IDs, emails, or customer/provider data.

## Pack Metadata

Manifest:

```text
source_agent=ai_node_canary
data_classification=redacted_operational_canary
files=ai-node-canary-health.boundary.json
sha256=b17351f0ca1299809f8cb7b162f773376b0a35276a5fb1ebde830ea5e6a161d6
```

Trace:

```text
metadata.status=succeeded
event_count=5
event_types=run.started, health.check, health.check, health.check, run.completed
sha256=4aa56b2bc88a00c5e94d5c084c16dbf625f8b2c8652efa744b1efa2f02158659
```

Validation report:

```text
sha256=5470876dbec08dca1a2a12673c85c90ec6e1e9816b00c80b464678b95e19f01a
```

Redaction grep result:

```text
redaction_grep=passed
```

## Deployment State During Verification

Phosphene service:

```text
root_http_code=200
deploy_short=2029963
built_at=2026-06-20T21:54:28Z
```

Served snapshot remained the existing Hermes operator-demo snapshot:

```text
served_snapshot_source=hermes
served_snapshot_classification=synthetic_redacted
served_snapshot_sha256=c70db94577f627e4179918282e0753aaf41fb3a5f3e8e7b51b2a9051d90859ee
```

After LaunchAgent installation, the served snapshot still remained:

```text
served_snapshot_source=hermes
served_snapshot_classification=synthetic_redacted
served_snapshot_sha256=c70db94577f627e4179918282e0753aaf41fb3a5f3e8e7b51b2a9051d90859ee
```

## Boundary Meaning

This canary is the first small step toward AI-Node-side adapter output. It proves that a process on the AI Node can generate a redacted Boundary pack from real operational markers and pass the same publisher gate used for Hermes snapshots.

It does not yet observe live Hermes/AAG/OpenClaw/Sentinel agent events.
