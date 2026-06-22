# Phosphene Release Status

Checked: 2026-06-22.
Repository checkpoint: `8525c06c93c36580cd19311a7324a4c17e7c67f9`
(`docs(plans): reconcile node observer v01 plan`).

## Current Decision

Technical development status: complete.

Publication status: deferred.

Phosphene is built to the agreed internal development scope. The remaining work
is release infrastructure and account/domain setup, not application feature
development. Keep public launch posts and the final `phosphene.dev` launch
behind the release gates below.

## Technical Completion Evidence

Fresh verification on the current checkpoint:

- `pnpm vitest run` passed: 61 test files, 190 tests.
- `pnpm lint` passed.
- `pnpm build` passed.
- `pnpm smoke:app` passed for the built app.
- GitHub Pages workflow run `27942247844` passed, including lint, tests, build,
  browser install, app smoke, and Pages deploy.
- AI Node deploy is on `8525c06`; `node-deploy.json` reports build time
  `2026-06-22T09:17:40Z`.
- AI Node loopback routes return HTTP 200 for `/`, `/landing/`,
  `/node-deploy.json`, `/snapshots/current/manifest.json`,
  `/snapshots/canary/latest.json`, and `/snapshots/live/latest.json`.
- GitHub Pages fallback routes return HTTP 200 for `/`, `/landing/`,
  `/snapshots/current/manifest.json`, `/snapshots/canary/latest.json`, and
  `/snapshots/live/latest.json`.
- `pnpm --silent publish:packages:dry-run` passed; the npm package payload is
  dry-run publishable.

## What Is Technically Done

The development scope is complete for:

- Reasoning Lab and Node Observer modes.
- Redacted built-in demo traces and Hermes synthetic handoff fixtures.
- Published AI Node snapshot loading.
- AI Node Canary and near-live adapter marker loading.
- No raw live telemetry boundaries in UI, docs, and loader validation.
- Boundary trace validation, local import, and snapshot publication tooling.
- Graph search, compare, side-by-side compare, stats, pattern detection,
  exports, share links, session history, portable sessions, hosted sessions,
  annotations, and Constitution Mode.
- Custom OpenAI-compatible API profiles and supported provider adapters.
- Parser and graph package exports with ESM/declaration builds, pack manifest
  checks, consumer smokes, typecheck smokes, and dry-run publish gate.
- CI gates for lint, tests, build, Playwright app smoke, and Pages deploy.
- AI Node deploy helper preserving published snapshots and syncing redacted
  canary/live-adapter status.

## Still Not Part Of This Release

These remain explicit non-scope items unless a later project reopens them:

- Raw private chain-of-thought access.
- Raw live Hermes/AAG/OpenClaw/Sentinel/Gmail/Workspace telemetry.
- Provider payload capture or raw side-effect execution observation.
- Account-backed hosted sessions, realtime collaborative editing, server-side
  session persistence, or automatic hosted graph activation.
- Plugin marketplace/runtime execution.
- Policy-server enforcement or account-backed Constitution repositories.

## Deferred Publication Gates

`pnpm --silent release:preflight` currently reports `blocked` with two ready
gates and five external blockers.

Ready:

- Public demo fallback: `https://reyk-zepper.github.io/phosphene/`
- Package publish dry-run

Blocked:

- `phosphene.dev` is reachable but still serves `Geiss-web - Phase 0 spike`.
- npm CLI is not logged in; `npm whoami` returns `ENEEDAUTH`.
- `@reyk-zepper/phosphene` is not published; `npm view` returns `E404`.
- GitHub org `phosphene-ai` is missing or the local token lacks `admin:org`.
- GitHub Pages has no `phosphene.dev` custom-domain CNAME.

## Publication Resume Checklist

When publication becomes the active task again:

1. Move `phosphene.dev` DNS/hosting to the Phosphene GitHub Pages build.
2. Verify the domain:

   ```bash
   pnpm --silent launch:preflight
   ```

3. After DNS is serving Phosphene, configure `phosphene.dev` as the GitHub
   Pages custom domain. Do not set the custom domain before DNS points at
   Phosphene; that previously produced stale redirect/cache behavior.
4. Log in to npm with the intended publishing account:

   ```bash
   npm login
   ```

5. Re-run the package gate and publish:

   ```bash
   pnpm --silent publish:packages:dry-run
   npm publish --access public
   npm view @reyk-zepper/phosphene version --json
   ```

6. Create or expose the GitHub org:

   ```bash
   gh auth refresh -h github.com -s admin:org
   gh api orgs/phosphene-ai --jq .login
   ```

7. Decide whether `reyk-zepper/phosphene` remains canonical or becomes a mirror,
   then create org remotes if needed:

   ```bash
   gh repo create phosphene-ai/phosphene --public --source /Users/reykz/repositorys/phosphene --remote phosphene-ai
   gh repo create phosphene-ai/constitution --public --source /Users/reykz/repositorys/constitution --remote phosphene-ai
   ```

8. Run the final release gate:

   ```bash
   pnpm --silent release:preflight
   ```

The publication is ready only when `release:preflight` reports `ready`.
