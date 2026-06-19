# Published Redacted Snapshot v0.1.7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a safe published-snapshot intake path so Node Observer can load a redacted Boundary pack from `/snapshots/current/`.

**Architecture:** Add a pure snapshot loader that fetches `manifest.json`, listed trace bundles, and optional `validation-report.json`, then delegates validation to existing trace intake code. App state treats loaded snapshot traces as a separate observer group and readiness item while preserving manual import and static demo fallbacks.

**Tech Stack:** React, TypeScript, Vite public assets, Vitest, existing Boundary trace validators.

---

### Task 1: Seed Public Snapshot

**Files:**
- Create: `public/snapshots/current/*.json`
- Create: `public/snapshots/current/README.md`
- Modify: `docs/product/phosphene-ai-node-integration-boundary.md`
- Modify: `docs/demo/phosphene-node-observer-demo.md`

- [x] Copy the repaired Hermes 2026-06-19 handoff files into `public/snapshots/current/`.
- [x] Document the served URL `/snapshots/current/manifest.json`.
- [x] Document that the snapshot is redacted published output, not live telemetry.
- [x] Validate the copied files with `corepack pnpm validate:traces -- public/snapshots/current`.

### Task 2: Snapshot Loader

**Files:**
- Create: `src/core/traces/snapshot.ts`
- Create: `tests/traces/snapshot.test.ts`

- [x] Write failing tests for available, unavailable, and blocked snapshot loads.
- [x] Implement `loadPublishedSnapshot(fetcher, basePath)` with no React dependency.
- [x] Parse `manifest.json.files`, fetch each listed trace file, fetch optional `validation-report.json`, and pass all fetched files through `parseTraceIntakeFiles`.
- [x] Return status `available`, `partial`, `blocked`, or `unavailable` without throwing.
- [x] Run `corepack pnpm vitest run tests/traces/snapshot.test.ts`.

### Task 3: Readiness Integration

**Files:**
- Modify: `src/core/traces/readiness.ts`
- Modify: `tests/traces/readiness.test.ts`

- [x] Extend readiness with `Published Snapshot`.
- [x] Map available snapshot to `ready`.
- [x] Map missing snapshot to `not_connected`.
- [x] Map blocked or partial snapshot to `partial`.
- [x] Run `corepack pnpm vitest run tests/traces/readiness.test.ts`.

### Task 4: Node Observer UI Integration

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/components/observer/NodeObserverBar.tsx`
- Modify: `src/constants/demoTraces.ts`
- Modify: `tests/traces/demoTraces.test.ts`
- Modify: `package.json`

- [x] Fetch the published snapshot once on startup.
- [x] Add snapshot traces as a `Published AI Node Snapshot` group when available.
- [x] Dedupe static observer groups by trace id when the snapshot contains the same runs.
- [x] Keep manual import traces above snapshot/static groups.
- [x] Update version label to `v0.1.7`.
- [x] Run targeted trace tests.

### Task 5: Verification and Deploy

**Files:**
- All changed files.

- [x] Run `corepack pnpm vitest run`.
- [x] Run `corepack pnpm validate:traces -- src/core/traces/handoffs/hermes-synthetic-2026-06-18 src/core/traces/handoffs/hermes-synthetic-2026-06-19 public/snapshots/current`.
- [x] Run `corepack pnpm tsc -b --pretty false`.
- [x] Run `corepack pnpm lint`.
- [x] Run `corepack pnpm build`.
- [x] Verify built bundle contains `v0.1.7` and `Published AI Node Snapshot`.
- [x] Commit, push, deploy with `ssh rAIk.mini /Users/raik./ai-stack/scripts/update-phosphene.sh`.
- [x] Verify `node-deploy.json`, HTTP 200, and served `/snapshots/current/manifest.json`.
