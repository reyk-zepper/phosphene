# Node Observer v0.1.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Node Observer demo-ready by hardening the Boundary JSON contract, surfacing run-level meaning, and improving event detail readability.

**Architecture:** Boundary JSON becomes a versioned bundle with `schema_version`, `metadata`, and `events`. The import adapter validates this contract before converting to `NodeTrace`, while UI components render derived run summaries and structured event evidence from the existing graph metadata.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Tailwind CSS classes, D3/Dagre graph rendering.

---

### Task 1: Versioned Boundary Contract

**Files:**
- Modify: `src/core/traces/types.ts`
- Modify: `src/core/traces/boundary.ts`
- Modify: `src/core/traces/boundaryImport.ts`
- Modify: `src/constants/demoTraces.ts`
- Modify: `src/core/traces/demo/*.json`
- Create: `docs/product/phosphene-boundary-trace.schema.json`
- Test: `tests/traces/boundary.test.ts`
- Test: `tests/traces/demoTraces.test.ts`

- [x] Add a supported schema version constant: `phosphene.boundary.v0.1.2`.
- [x] Update demo fixtures from raw event arrays to bundles containing `schema_version`, `metadata`, and `events`.
- [x] Reject object imports whose `schema_version` is missing or unsupported.
- [x] Keep raw event-array import as legacy/fallback behavior for local experiments.
- [x] Add a JSON Schema document matching the Boundary bundle contract.
- [x] Add tests proving supported bundles pass, unsupported versions fail, and demo fixtures all use the supported schema version.

### Task 2: Run Summary Model

**Files:**
- Modify: `src/core/traces/types.ts`
- Create: `src/core/traces/summary.ts`
- Modify: `src/core/traces/toGraph.ts`
- Test: `tests/traces/summary.test.ts`

- [x] Derive a `NodeTraceSummary` from trace events with event count, source list, risk level, decision count, approval count, failure count, recovery count, terminal status, and duration.
- [x] Attach summary data to `NodeTrace`.
- [x] Keep existing graph consumers working through the normalized `NodeTrace` model.
- [x] Add tests for approval-heavy, worker-success, and recovery traces.

### Task 3: Observer UI Readability

**Files:**
- Create: `src/components/observer/RunSummaryPanel.tsx`
- Modify: `src/components/observer/NodeObserverBar.tsx`
- Modify: `src/components/detail/DetailPanel.tsx`
- Modify: `src/app/App.tsx`

- [x] Render a compact run summary panel below the observer controls.
- [x] Show outcome, highest risk, systems, approvals, failures/recoveries, and duration without requiring a node click.
- [x] Split event details into readable groups: Identity, Action, Gate, Evidence.
- [x] Preserve current graph and detail behavior for Reasoning Lab.
- [x] Keep mobile layout usable by wrapping summary tiles and keeping labels compact.

### Task 4: Verification And Deploy

**Files:**
- Modify: `README.md`
- Modify: `docs/product/phosphene-node-observer-v0.1.md`
- Modify: `package.json`

- [x] Document schema version and local-only import behavior.
- [x] Bump package version to `0.1.2`.
- [x] Run `vitest`, `eslint`, `tsc -b`, and `vite build`.
- [x] Run browser QA for desktop and mobile import/summary flows.
- [x] Commit, push `main`, deploy with `ssh rAIk.mini /Users/raik./ai-stack/scripts/update-phosphene.sh`, and verify `node-deploy.json` reports the new commit.
