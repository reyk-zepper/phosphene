# Phosphene Node Observer v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-explanatory `Node Observer` mode that can display redacted AI-node trace samples for Hermes, OpenClaw, AAG, and sentinels.

**Architecture:** Introduce a trace model under `src/core/traces`, convert traces into the existing `ReasoningGraph`, then add a mode switch and observer toolbar in the app shell. Reuse the existing graph canvas and detail panel so this stays a focused slice.

**Tech Stack:** React 19, TypeScript, Zustand-light local state, Vite, Vitest, D3/dagre graph renderer.

---

### Task 1: Trace Model And Adapter

**Files:**
- Create: `src/core/traces/types.ts`
- Create: `src/core/traces/toGraph.ts`
- Create: `tests/traces/toGraph.test.ts`
- Modify: `src/core/parser/types.ts`

- [ ] Write failing tests for trace-to-graph conversion.
- [ ] Run `pnpm exec vitest run tests/traces/toGraph.test.ts` and verify it fails because the trace module is missing.
- [ ] Implement trace types and adapter.
- [ ] Run the targeted test and verify it passes.

### Task 2: Demo AI-Node Traces

**Files:**
- Create: `src/constants/demoTraces.ts`
- Create: `tests/traces/demoTraces.test.ts`

- [ ] Write failing tests that demo traces have unique ids, a root event, and valid parent references.
- [ ] Run the targeted tests and verify they fail because demo traces are missing.
- [ ] Add redacted demo traces for Hermes/AAG Workspace, OpenClaw worker, and Sentinel recovery.
- [ ] Run the targeted tests and verify they pass.

### Task 3: Observer UI Mode

**Files:**
- Create: `src/components/shell/ModeSwitch.tsx`
- Create: `src/components/observer/NodeObserverBar.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/components/graph/GraphCanvas.tsx`
- Modify: `src/components/detail/DetailPanel.tsx`
- Modify: `src/components/graph/GraphLegend.tsx`

- [ ] Add a mode switch for `Reasoning Lab` and `Node Observer`.
- [ ] Add an observer bar for selecting sample traces.
- [ ] In observer mode, load the selected trace as the current graph.
- [ ] Use custom node labels where present.
- [ ] Show trace metadata in the detail panel when available.
- [ ] Keep the existing reasoning prompt workflow intact.

### Task 4: Verification And Deployment

**Files:**
- Modify only if verification exposes issues.

- [ ] Run `pnpm exec vitest run`.
- [ ] Run `pnpm build`.
- [ ] Start the local dev server and perform a browser/HTTP smoke where possible.
- [ ] Deploy to the Mac mini using `ssh rAIk.mini /Users/raik./ai-stack/scripts/update-phosphene.sh` after local verification.
- [ ] Verify `http://127.0.0.1:5173/node-deploy.json` on the Mac mini.
