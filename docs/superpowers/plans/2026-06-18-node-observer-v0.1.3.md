# Node Observer v0.1.3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Hermes synthetic Boundary handoff into a repeatable Trace Intake flow with grouped built-in fixtures, visible validation results, and a CLI validator Hermes can target.

**Architecture:** Move Boundary validation into a shared pure TypeScript module used by both browser import and a Node CLI script. Store Hermes synthetic handoff bundles as a separate fixture group next to existing demo traces, normalize both through the same Boundary adapter, and render trace groups in the Node Observer selector without claiming live telemetry.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Node ESM scripts, Tailwind CSS classes.

---

### Task 1: Shared Boundary Validation

**Files:**
- Create: `src/core/traces/boundaryValidation.ts`
- Modify: `src/core/traces/boundaryImport.ts`
- Test: `tests/traces/boundaryValidation.test.ts`

- [x] Move schema, enum, parent, link-shape, and redaction checks into a reusable validator.
- [x] Return structured results with `checks` for `json`, `schema_version`, `shape`, `graph`, `enums`, and `redaction`.
- [x] Keep `parseBoundaryTraceJson` API compatible for the UI.
- [x] Add tests for accepted bundles, string-array `links`, unsupported versions, private URLs, and missing parents.

### Task 2: CLI Validator

**Files:**
- Create: `scripts/validate-boundary-traces.mjs`
- Modify: `package.json`
- Test: `tests/traces/boundaryValidation.test.ts`

- [x] Add `pnpm validate:traces -- <files-or-directories>` script.
- [x] Validate all `*.json` files passed directly or found under directories.
- [x] Print a concise per-file report and exit non-zero on failures.
- [x] Add a test that calls the underlying library behavior rather than shelling out.

### Task 3: Hermes Handoff Gallery Fixtures

**Files:**
- Create: `src/core/traces/handoffs/hermes-synthetic-2026-06-18/*.json`
- Modify: `src/constants/demoTraces.ts`
- Test: `tests/traces/demoTraces.test.ts`

- [x] Add the four verified Hermes synthetic handoff bundles as repo fixtures.
- [x] Create trace groups: `Built-in Demo Traces` and `Hermes Synthetic Handoffs`.
- [x] Export grouped normalized traces without changing the existing `DEMO_TRACES` export.
- [x] Test group names, counts, schema versions, and importability.

### Task 4: Node Observer Intake UI

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/components/observer/NodeObserverBar.tsx`
- Create: `src/components/observer/ImportValidationPanel.tsx`
- Modify: `README.md`
- Modify: `docs/product/phosphene-node-observer-v0.1.md`
- Modify: `package.json`

- [x] Show trace groups in the select options with labels.
- [x] Label Hermes handoff traces as `synthetic handoff`, not live telemetry.
- [x] Show import validation checks for accepted and blocked uploads.
- [x] Bump version to `0.1.3`.
- [x] Update docs with validator command and Handoff Gallery status.

### Task 5: Verification And Deploy

- [x] Run `vitest run`.
- [x] Run `eslint .`.
- [x] Run `tsc -b --pretty false`.
- [x] Run `vite build`.
- [x] Run CLI validator against demo and handoff fixtures.
- [x] Run desktop and mobile Browser QA for group selection and upload validation.
- [x] Commit, push, deploy on Mac mini, and verify `node-deploy.json`.
