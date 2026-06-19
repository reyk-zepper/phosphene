# Published Redacted Snapshot v0.1.7 Design

## Goal

Move Phosphene one step beyond manual handoff import by letting Node Observer load a redacted AI Node snapshot from a static, Phosphene-served URL.

This is still **not live telemetry**. The snapshot is a published Boundary pack. Phosphene consumes only sanitized files that are already in its public serving boundary.

## Product Behavior

- Node Observer fetches `/snapshots/current/manifest.json` on startup.
- If the snapshot is available and valid, its traces appear in a `Published AI Node Snapshot` run group.
- The readiness strip gains a `Published Snapshot` item.
- The existing `AI Node Live Adapter` item remains `not_connected`.
- Manual JSON import remains available.
- Built-in demo traces and Hermes synthetic handoffs remain fallback/demo material.

## Data Boundary

Seed snapshot in the repo:

```text
public/snapshots/current/
```

Served snapshot after build/deploy:

```text
http://127.0.0.1:5173/snapshots/current/
```

AI Node deploy path after `update-phosphene.sh`:

```text
/Users/raik./ai-stack/services/phosphene/dist/snapshots/current/
```

Future Hermes/publisher output can write a redacted Boundary pack into that served `dist/snapshots/current/` directory. Phosphene must not read private AI Node paths from the browser.

## Snapshot Contract

The snapshot directory contains:

- `manifest.json`
- optional `validation-report.json`
- one or more Boundary trace bundles listed in `manifest.json.files`

Trace bundles use the existing schema:

```text
phosphene.boundary.v0.1.2
```

The same redaction rules apply as manual imports:

- no secrets
- no tokens
- no private URLs
- no raw provider IDs
- no real email addresses
- no customer/provider payloads
- optional string fields are omitted when absent, not set to `null`

## UI Design

The existing Node Observer bar stays compact. The snapshot is visible through:

- a new readiness item: `Published Snapshot`
- a new optgroup in the run selector when loaded
- the existing run summary, graph, detail panel, and evidence fields

If the snapshot cannot be loaded, the UI should remain usable and show static traces. Failure should be visible but not disruptive.

## Error Handling

- Missing manifest: readiness shows snapshot unavailable.
- Invalid manifest or trace bundle: readiness shows partial/blocked.
- Partially valid snapshot: accepted traces are shown, blocked files remain visible in status.
- Network/fetch errors are captured as user-facing details, not thrown into React.

## Tests

- Unit-test snapshot loading from mocked fetch responses.
- Unit-test unavailable and blocked snapshot states.
- Unit-test readiness output with available and unavailable snapshots.
- Keep existing Boundary validation, import, lint, typecheck, and build commands green.
