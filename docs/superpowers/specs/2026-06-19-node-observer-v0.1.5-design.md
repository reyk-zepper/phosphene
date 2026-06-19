# Node Observer v0.1.5 Demo Readiness Design

## Purpose

v0.1.5 makes Phosphene easier to demo and harder to mis-frame. The project context should state that Phosphene is now both Reasoning Lab and Node Observer, while Hermes and future live adapters operate on the AI Node, not on the local development machine.

## Scope

- Update the project context so future work does not drift back to a prompt-only reasoning visualizer.
- Document the AI Node integration boundary, including Hermes handoff paths and non-local execution rules.
- Add a demo document that describes exactly what can be shown today and which live claims are still out of scope.
- Add a compact Node Observer readiness panel showing Boundary, Handoff Intake, and AI Node Live Adapter status.
- Keep live telemetry marked as not connected until a real AI Node adapter exists.

## Non-Scope

- No live Hermes/AAG/OpenClaw/Sentinel adapter.
- No browser access to AI Node filesystem paths.
- No local Hermes execution.
- No new backend or server process.
- No persistence of imported traces after reload.

## UI Design

The Node Observer header remains dense and operational. Below the run summary, Phosphene shows a compact readiness strip with three status cells:

- Boundary Contract: ready, showing trace count.
- Handoff Intake: ready or partial, showing import/block counts when a batch is selected.
- AI Node Live Adapter: not connected.

This is a status surface, not a tutorial. It should reinforce demo safety and avoid claiming live telemetry.

## AI Node Boundary

Future live integration means AI Node-side generation or publication of redacted Boundary traces. Hermes works on the AI Node and has no local machine access. Phosphene consumes validated Boundary bundles or a future redacted snapshot/adapter output; it does not read private AI Node paths directly from the browser.

## Testing

- Unit tests cover readiness status generation.
- Browser QA confirms the readiness strip is visible and says the live adapter is not connected.
- Existing trace and intake tests continue to pass.

