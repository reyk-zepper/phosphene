# Node Observer v0.1.4 Handoff Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local multi-file Handoff Intake path for Boundary traces, Hermes manifests, and Hermes validation reports.

**Architecture:** Add a browser-safe `src/core/traces/intake.ts` module that classifies selected JSON files, delegates trace bundles to the existing Boundary validator, and returns a batch result. Update `App` and `NodeObserverBar` to read multiple files and render a compact intake table. Extend the self-contained Node CLI to treat manifest and validation-report JSON as support documents instead of invalid trace files.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Node ESM scripts, Tailwind CSS classes.

---

### Task 1: Core Intake Parser

**Files:**
- Create: `src/core/traces/intake.ts`
- Test: `tests/traces/intake.test.ts`

- [x] Write failing tests for a mixed batch containing one valid trace, one invalid trace, `manifest.json`, and `validation-report.json`.
- [x] Implement `parseTraceIntakeFiles(inputs)` returning `traces`, `items`, and `summary`.
- [x] Ensure invalid traces do not prevent valid traces from importing.
- [x] Ensure manifest and validation-report files are support items and never graph traces.

### Task 2: CLI Support Files

**Files:**
- Modify: `scripts/validate-boundary-traces.mjs`
- Test: `tests/traces/intake.test.ts`

- [x] Add a fixture-backed test expectation that support files are classified separately.
- [x] Update the CLI to report `PASS <file> (manifest)` and `PASS <file> (validation_report)`.
- [x] Keep non-zero exit behavior for invalid traces or invalid support files.

### Task 3: Multi-file Observer UI

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/components/observer/NodeObserverBar.tsx`

- [x] Replace single-file import handler with multi-file handler.
- [x] Add `multiple` to the file input.
- [x] Render a batch intake table below the run summary.
- [x] Keep imported traces grouped as `Imported Local Files`.

### Task 4: Version and Docs

**Files:**
- Modify: `package.json`
- Modify: `src/app/App.tsx`
- Modify: `README.md`
- Modify: `docs/product/phosphene-node-observer-v0.1.md`
- Modify: `docs/product/phosphene-hermes-boundary-handoff-2026-06-18.md`

- [x] Bump app/package version to `0.1.4`.
- [x] Document multi-file local intake and manifest/report support.
- [x] Keep no-live-telemetry language explicit.

### Task 5: Verification and Deploy

- [ ] Run `vitest run`.
- [ ] Run `pnpm validate:traces -- <handoff-directory-with-support-files>`.
- [ ] Run `eslint .`.
- [ ] Run `tsc -b --pretty false`.
- [ ] Run `pnpm build`.
- [ ] Run browser QA for multi-file upload and intake table.
- [ ] Commit, push, deploy on Mac mini, and verify `node-deploy.json`.
