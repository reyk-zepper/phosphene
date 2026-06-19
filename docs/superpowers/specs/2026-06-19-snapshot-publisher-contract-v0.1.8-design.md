# Snapshot Publisher Contract v0.1.8 Design

## Intent

v0.1.8 turns the published snapshot path from a static seeded directory into an executable publish contract. Hermes still works only on the AI Node and Phosphene still does not claim live telemetry. The new slice gives AI Node workers a safe CLI target for publishing a redacted Boundary pack into the static path Phosphene already serves.

## Scope

- Add a Node CLI that validates a source Boundary pack before publication.
- Publish only `manifest.json`, `validation-report.json`, `README.md`, and the trace JSON files listed by `manifest.files`.
- Write through a temporary directory, then atomically replace the target snapshot directory.
- Default the target to `dist/snapshots/current`, which is the AI Node served path after deploy.
- Add a package script so Hermes can call the contract without knowing implementation details.
- Document the exact Hermes/AI Node command and the non-live boundary.

## Non-Scope

- No live streaming adapter.
- No direct browser access to AI Node filesystem paths.
- No local Hermes execution.
- No side effects against Gmail, Workspace, providers, or private AI Node services.
- No publication of files not referenced by the manifest, except `README.md` and `validation-report.json`.

## CLI Contract

Command:

```bash
corepack pnpm publish:snapshot -- --source <boundary-pack-dir> [--target <snapshot-dir>] [--dry-run]
```

Defaults:

```text
target = dist/snapshots/current
```

The CLI must fail before writing when:

- `--source` is missing.
- `manifest.json` is missing or invalid.
- `manifest.files` is empty or references missing files.
- a manifest entry escapes the source directory.
- validation fails through `scripts/validate-boundary-traces.mjs`.

`--dry-run` performs validation and prints the publish plan without touching the target.

## Data Flow

```text
Hermes/AAG/OpenClaw/Sentinel redacted Boundary pack
        ↓
scripts/publish-snapshot.mjs
        ↓
validate-boundary-traces.mjs
        ↓
temporary snapshot directory
        ↓
atomic target replacement
        ↓
dist/snapshots/current/
        ↓
Phosphene /snapshots/current/manifest.json
```

## Safety Rules

The publisher delegates schema and redaction checks to the existing Boundary validator. It also narrows the publish surface by copying only manifest-listed trace files plus accepted support files. The script must never infer private runtime paths, open ports, deploy, or describe the result as live telemetry.

## Testing

- Unit-test dry-run behavior with a valid source directory.
- Unit-test atomic publish into a temporary target directory.
- Unit-test blocked publication when the manifest references a missing trace file.
- Unit-test blocked publication when validation fails.
- Keep existing trace validation, TypeScript, lint, and build checks green.
