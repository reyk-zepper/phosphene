# Node Observer v0.1.5 Demo Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Phosphene demo-ready while explicitly preserving the AI Node/Hermes integration boundary.

**Architecture:** Add a small pure readiness model in `src/core/traces/readiness.ts`, render it as a compact status strip in `NodeObserverBar`, and update project/product/demo docs so future work treats live integration as AI Node-side adapter output rather than local Hermes execution.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Tailwind CSS classes.

---

### Task 1: Readiness State

**Files:**
- Create: `src/core/traces/readiness.ts`
- Test: `tests/traces/readiness.test.ts`

- [x] Write failing tests for readiness items: Boundary Contract, Handoff Intake, AI Node Live Adapter.
- [x] Implement `createObserverReadiness`.
- [x] Verify live adapter status remains `not_connected`.

### Task 2: Readiness UI

**Files:**
- Modify: `src/components/observer/NodeObserverBar.tsx`
- Modify: `src/app/App.tsx`

- [x] Render readiness state below `RunSummaryPanel`.
- [x] Keep the UI compact and status-oriented, not tutorial-oriented.
- [x] Bump app label to `v0.1.5`.

### Task 3: Context and Demo Docs

**Files:**
- Modify: `CLAUDE.md`
- Create: `docs/product/phosphene-ai-node-integration-boundary.md`
- Create: `docs/demo/phosphene-node-observer-demo.md`
- Modify: `README.md`
- Modify: `docs/product/phosphene-node-observer-v0.1.md`
- Modify: `package.json`

- [x] Document Hermes as AI Node-only worker.
- [x] Document current manual handoff path and future adapter stages.
- [x] Document what can be demoed today and what must not be claimed.
- [x] Bump package version to `0.1.5`.

### Task 4: Verification and Deploy

- [ ] Run `vitest run`.
- [ ] Run `pnpm validate:traces -- src/core/traces/handoffs/hermes-synthetic-2026-06-18`.
- [ ] Run `eslint .`.
- [ ] Run `tsc -b --pretty false`.
- [ ] Run `pnpm build`.
- [ ] Run browser QA for readiness strip and no-live-adapter status.
- [ ] Commit, push, deploy, and verify `node-deploy.json`.
