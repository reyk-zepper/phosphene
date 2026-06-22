# Snapshot Publisher Contract v0.1.8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an executable AI Node snapshot publisher contract for validated redacted Boundary packs.

**Architecture:** A Node CLI validates a source directory with the existing Boundary validator, reads `manifest.json`, builds an allowlist of publishable files, copies them into a temporary directory, and atomically replaces `dist/snapshots/current` or an explicit target. Phosphene's UI continues to consume only the static `/snapshots/current/` boundary added in v0.1.7.

**Tech Stack:** Node ESM scripts, Vitest, existing Boundary JSON validator, Vite public static output.

---

### Task 1: Publisher CLI Tests

**Files:**
- Create: `tests/scripts/publishSnapshot.test.ts`
- Read: `public/snapshots/current/manifest.json`

- [x] Write a failing test that runs `node scripts/publish-snapshot.mjs --source public/snapshots/current --target <tmp> --dry-run` and expects no target directory to be created.
- [x] Write a failing test that accepts a package-manager `--` separator before CLI options.
- [x] Write a failing test that publishes `public/snapshots/current` into a temporary target and expects `manifest.json`, `validation-report.json`, `README.md`, and four trace files in the target.
- [x] Write a failing test that uses a copied source with one missing manifest-listed trace and expects a non-zero exit.
- [x] Write a failing test that uses a copied source containing a forbidden email pattern in a trace summary and expects validation failure.
- [x] Run `corepack pnpm vitest run tests/scripts/publishSnapshot.test.ts` and verify the tests fail because `scripts/publish-snapshot.mjs` does not exist.

### Task 2: Publisher CLI Implementation

**Files:**
- Create: `scripts/publish-snapshot.mjs`
- Modify: `package.json`

- [x] Implement option parsing for `--source`, `--target`, `--dry-run`, and `--help`.
- [x] Read and validate `manifest.json` before copying.
- [x] Reject absolute manifest file paths, `..` path traversal, nested directory escapes, and missing files.
- [x] Run `node scripts/validate-boundary-traces.mjs <source>` before writing.
- [x] Copy only manifest-listed trace files plus `manifest.json`, `validation-report.json` when present, and `README.md` when present.
- [x] Publish by copying into `<target>.tmp-<pid>-<timestamp>`, removing `<target>.previous-<pid>-<timestamp>`, renaming the existing target to previous when present, renaming tmp to target, then deleting previous.
- [x] On publish failure after moving the old target, restore the previous target.
- [x] Add `"publish:snapshot": "node scripts/publish-snapshot.mjs"` to `package.json`.
- [x] Run `corepack pnpm vitest run tests/scripts/publishSnapshot.test.ts` and verify it passes.

### Task 3: Docs and Verification

**Files:**
- Modify: `docs/product/phosphene-ai-node-integration-boundary.md`
- Modify: `docs/demo/phosphene-node-observer-demo.md`
- Modify: `docs/product/phosphene-node-observer-v0.1.md`
- Modify: `package.json`

- [x] Bump package version to `0.1.8`.
- [x] Document the Hermes command for AI Node publication:

```bash
cd /Users/raik./ai-stack/services/phosphene
corepack pnpm publish:snapshot -- --source /Users/raik./ai-stack/data/hermes/home/phosphene-handoffs/<pack> --target dist/snapshots/current
```

- [x] Document that published snapshots are periodically published redacted Boundary output, not live telemetry.
- [x] Run `corepack pnpm publish:snapshot -- --source public/snapshots/current --target /tmp/phosphene-snapshot-publish-check --dry-run`.
- [x] Run `corepack pnpm publish:snapshot -- --source public/snapshots/current --target /tmp/phosphene-snapshot-publish-check`.
- [x] Run `corepack pnpm vitest run`.
- [x] Run `corepack pnpm validate:traces -- public/snapshots/current`.
- [x] Run `corepack pnpm tsc -b --pretty false`.
- [x] Run `corepack pnpm lint`.
- [x] Run `corepack pnpm build`.
- [x] Commit, push, deploy with `ssh rAIk.mini /Users/raik./ai-stack/scripts/update-phosphene.sh`, and verify `node-deploy.json`, HTTP 200, `/snapshots/current/manifest.json`, and `corepack pnpm publish:snapshot -- --source public/snapshots/current --target /tmp/phosphene-publish-ai-node-check --dry-run` on the AI Node.
