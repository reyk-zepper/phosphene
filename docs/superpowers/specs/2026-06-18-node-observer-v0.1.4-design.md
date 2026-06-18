# Node Observer v0.1.4 Handoff Intake Design

## Purpose

v0.1.4 turns the v0.1.3 single-file import into a repeatable handoff intake path. Phosphene should accept multiple local JSON files at once, import every valid Boundary trace, block invalid trace files individually, and display manifest or validation-report context when Hermes includes support files.

This remains local-only, synthetic/redacted-first, and explicitly not live telemetry.

## Scope

- Support selecting multiple `.json` files in Node Observer.
- Parse Boundary trace bundles, Hermes `manifest.json`, and Hermes `validation-report.json`.
- Import valid trace bundles even when other selected files fail.
- Show a compact intake table with per-file kind, status, and failing checks.
- Update CLI validation so a directory containing manifest/report plus trace bundles can be validated without false failures.
- Keep the existing static handoff gallery and graph rendering model unchanged.

## Non-Scope

- No live filesystem watcher.
- No automatic SSH pull from the AI Node.
- No live Hermes/AAG/OpenClaw/Sentinel integration.
- No persistence of imported traces after reload.
- No public/private URL display beyond existing redaction checks.

## Architecture

Add a browser-safe core module at `src/core/traces/intake.ts`. It accepts `{ name, text }` file inputs and returns a `TraceIntakeBatchResult` containing imported `NodeTrace` objects, manifest metadata, validation-report metadata, and per-file results.

The intake module uses the existing Boundary validator for trace files instead of duplicating trace rules. Manifest and validation-report files get a small shape/redaction check. App code reads selected `File` objects, calls the intake module once, merges accepted traces into `importedTraces`, and passes the full batch result to the observer UI.

The Node CLI stays self-contained but gains the same support-file classification: trace bundles are fully validated; manifest and validation-report files are validated as support documents and reported as pass/fail support entries.

## UI

`NodeObserverBar` keeps the existing compact header. The file input becomes multi-select. Below the run summary, an intake panel displays:

- batch summary: accepted trace count, blocked file count, support file count
- table rows for each selected JSON file
- row kind: trace, manifest, validation report, ignored JSON
- row status: imported, accepted support, blocked, ignored
- short error text for blocked rows

The visual style stays utilitarian and dense: small monospace rows, no modal, no landing-style copy.

## Data Flow

1. User selects one or more `.json` files.
2. App reads all files locally in the browser.
3. `parseTraceIntakeFiles` classifies each JSON file.
4. Trace bundle files go through `validateBoundaryTraceJson` and normalize into `NodeTrace`.
5. Manifest/report files validate as support context and do not create graph traces.
6. App merges valid traces, selects the first imported trace, and shows the batch result.

## Testing

- Unit tests cover mixed batches with valid traces, invalid traces, manifest, and validation report.
- Unit tests verify that invalid files do not block valid files.
- CLI is verified against a fixture directory containing all four trace bundles plus manifest/report support files.
- Browser QA verifies multi-file upload, visible batch table, valid imported selection, and invalid-row display.

