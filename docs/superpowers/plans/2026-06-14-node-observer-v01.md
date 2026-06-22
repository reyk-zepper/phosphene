# Phosphene Node Observer v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-explanatory `Node Observer` mode that can display redacted AI-node trace samples for Hermes, OpenClaw, AAG, and sentinels.

**Architecture:** Introduce a trace model under `src/core/traces`, convert traces into the existing `ReasoningGraph`, then add a mode switch and observer toolbar in the app shell. Reuse the existing graph canvas and detail panel so this stays a focused slice.

**Tech Stack:** React 19, TypeScript, Zustand-light local state, Vite, Vitest, D3/dagre graph renderer.

**Reconciliation 2026-06-22:** This historical v0.1 plan was completed in the
initial Node Observer implementation but still contained unchecked task markers.
Current evidence on `main`:
`tests/traces/toGraph.test.ts`, `tests/traces/demoTraces.test.ts`,
`src/core/traces/types.ts`, `src/core/traces/toGraph.ts`,
`src/components/shell/ModeSwitch.tsx`,
`src/components/observer/NodeObserverBar.tsx`, `tests/browser/appSmoke.spec.ts`,
and AI-node `node-deploy.json` for commit `a9b130a`. The original RED test
commands are historical; the current branch verifies the final behavior rather
than recreating the missing-module state.

---

### Task 1: Trace Model And Adapter

**Files:**
- Create: `src/core/traces/types.ts`
- Create: `src/core/traces/toGraph.ts`
- Create: `tests/traces/toGraph.test.ts`
- Modify: `src/core/parser/types.ts`

- [x] Write failing tests for trace-to-graph conversion.
- [x] Run `pnpm exec vitest run tests/traces/toGraph.test.ts` and verify it fails because the trace module is missing.
- [x] Implement trace types and adapter.
- [x] Run the targeted test and verify it passes.

2026-06-22 evidence: `pnpm vitest run tests/traces/toGraph.test.ts` passed on
the current branch, proving the trace model and adapter behavior are present.

### Task 2: Demo AI-Node Traces

**Files:**
- Create: `src/constants/demoTraces.ts`
- Create: `tests/traces/demoTraces.test.ts`

- [x] Write failing tests that demo traces have unique ids, a root event, and valid parent references.
- [x] Run the targeted tests and verify they fail because demo traces are missing.
- [x] Add redacted demo traces for Hermes/AAG Workspace, OpenClaw worker, and Sentinel recovery.
- [x] Run the targeted tests and verify they pass.

2026-06-22 evidence: `pnpm vitest run tests/traces/demoTraces.test.ts` passed
and covers built-in demo traces, Hermes synthetic handoffs, unique IDs, root
events, parent references, allowed status/source/risk values, redaction, and
graph rendering.

### Task 3: Observer UI Mode

**Files:**
- Create: `src/components/shell/ModeSwitch.tsx`
- Create: `src/components/observer/NodeObserverBar.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/components/graph/GraphCanvas.tsx`
- Modify: `src/components/detail/DetailPanel.tsx`
- Modify: `src/components/graph/GraphLegend.tsx`

- [x] Add a mode switch for `Reasoning Lab` and `Node Observer`.
- [x] Add an observer bar for selecting sample traces.
- [x] In observer mode, load the selected trace as the current graph.
- [x] Use custom node labels where present.
- [x] Show trace metadata in the detail panel when available.
- [x] Keep the existing reasoning prompt workflow intact.

2026-06-22 evidence: `src/app/App.tsx` wires `ModeSwitch` and
`NodeObserverBar`; `tests/app/observerCatalog.test.ts`,
`tests/app/deploymentBase.test.ts`, and `tests/browser/appSmoke.spec.ts` cover
observer catalog behavior, deployment routing, and a built browser smoke for
`?mode=observer`.

### Task 4: Verification And Deployment

**Files:**
- Modify only if verification exposes issues.

- [x] Run `pnpm exec vitest run`.
- [x] Run `pnpm build`.
- [x] Start the local dev server and perform a browser/HTTP smoke where possible.
- [x] Deploy to the Mac mini using `ssh rAIk.mini /Users/raik./ai-stack/scripts/update-phosphene.sh` after local verification.
- [x] Verify `http://127.0.0.1:5173/node-deploy.json` on the Mac mini.

2026-06-22 evidence: full local verification and GitHub Pages CI were green for
`a9b130a`; the AI-node service reports `a9b130a` in
`dist/node-deploy.json`, and `/`, `/landing/`, and `/node-deploy.json` return
HTTP 200 on `127.0.0.1:5173`.
