# Phosphene Launch Kit

Status: ready-to-use copy, not posted.
Checked: 2026-06-22.

## Current Launch Blockers

- GitHub org `phosphene-ai` is not created.
- Local `gh` auth has `repo`, `workflow`, and `read:org`, but not `admin:org`.
- GitHub Pages workflow exists and builds with `VITE_BASE_PATH=/phosphene/`,
  and the live Pages fallback is verified at
  `https://reyk-zepper.github.io/phosphene/`.
- `phosphene.dev` currently resolves behind Cloudflare, but serves
  `Geiss-web - Phase 0 spike`, not Phosphene. Treat it as blocked until DNS or
  hosting is moved to the Phosphene build.
- Public launch posts can use the GitHub Pages fallback now. Switch copy to
  `https://phosphene.dev/` only after `pnpm --silent launch:preflight` reports
  `ready`.

## Source Checks

- Hacker News Show HN guidelines:
  https://news.ycombinator.com/showhn.html
- r/MachineLearning rules:
  https://www.reddit.com/r/MachineLearning/
- X character counting docs:
  https://docs.x.com/fundamentals/counting-characters

## Launch Links

Use the final public URL when available:

- Public demo: `https://phosphene.dev/`
- GitHub Pages fallback: `https://reyk-zepper.github.io/phosphene/`
- GitHub repo: `https://github.com/reyk-zepper/phosphene`
- NPM package target: `@reyk-zepper/phosphene`

Current launch URL: `https://reyk-zepper.github.io/phosphene/`

Until `https://phosphene.dev/` is live, use the GitHub Pages fallback. Do not
submit a landing page alone to Show HN.

Launch preflight:

```bash
pnpm --silent launch:preflight
```

Expected current status: `fallback_ready` with `phosphene.dev: reachable but not
serving Phosphene` as the remaining URL blocker.

Release preflight:

```bash
pnpm --silent release:preflight
```

Expected current status: non-zero/`blocked`, with these external gates still
open:

- `phosphene.dev` is reachable but not serving Phosphene.
- npm CLI is not logged in.
- `@reyk-zepper/phosphene` is not published.
- GitHub org `phosphene-ai` is missing or the token lacks `admin:org`.
- GitHub Pages has no `phosphene.dev` CNAME.

## Hacker News

HN submission URL:

```text
https://news.ycombinator.com/submit
```

Title:

```text
Show HN: Phosphene - visualize AI reasoning traces as interactive graphs
```

URL:

```text
https://reyk-zepper.github.io/phosphene/
```

First comment:

```text
I built Phosphene as a client-side visual debugger for AI reasoning traces.

The core idea: turn a model run into a navigable graph, then make comparisons, token/depth stats, exports, search, annotations, and rule checks inspectable instead of burying everything in a transcript.

It currently includes:

- demo traces that run without API keys
- Anthropic/OpenAI/Gemini/Ollama/custom OpenAI-compatible adapters
- graph export, share links, search, stats, and side-by-side compare
- public package entries for the parser and graph engine
- a redacted AI-node observer boundary, explicitly not raw private telemetry

The part I am most interested in feedback on: what would make this useful for debugging real agent behavior without pretending to expose private chain-of-thought?
```

Do:

- Use `Show HN` only when the URL is directly usable.
- Be available for comments after posting.
- Answer with implementation details and tradeoffs.

Do not:

- Ask friends to upvote or comment.
- Submit a pure landing page.
- Claim raw model chain-of-thought access.

## Reddit r/MachineLearning

Recommended title:

```text
[P] Phosphene: open-source visual debugger for AI reasoning traces
```

Body:

```text
I built Phosphene, an open-source browser tool for inspecting AI reasoning traces as interactive graphs.

Demo: https://reyk-zepper.github.io/phosphene/
Repo: https://github.com/reyk-zepper/phosphene

What it does:

- parses reasoning-like traces into graph nodes
- renders a navigable DAG/tree with node detail panels
- supports demo traces without API keys
- supports Anthropic, OpenAI, Gemini, Ollama, and custom OpenAI-compatible endpoints
- compares same-prompt runs side by side
- includes graph search, stats, exports, share links, annotations, and rule testing
- exposes parser and graph package entries for reuse

Important boundary: this does not claim access to private raw chain-of-thought. The AI-node observer path is redacted operational telemetry, not private model internals.

I am looking for technical feedback from people who debug agents or research interpretability tooling:

1. What trace schema would make this easier to integrate with real agent runtimes?
2. Which graph views are actually useful for debugging failures?
3. Where should the boundary be between observable agent behavior and model-internal reasoning?
```

Posting notes:

- Keep it technical and feedback-oriented.
- Make clear it is open-source and not a paid product.
- Avoid reposting the same copy across many subreddits.
- Add screenshots/GIFs only if Reddit requires media-first presentation.

## X

Single post under the standard 280-character path:

```text
I built Phosphene: an open-source visual debugger for AI reasoning traces.

It turns prompt runs into navigable graphs with compare, stats, search, exports, annotations, and rule checks.

Demo: https://reyk-zepper.github.io/phosphene/
Repo: https://github.com/reyk-zepper/phosphene
```

Thread:

```text
1/ I built Phosphene, an open-source visual debugger for AI reasoning traces.

Instead of reading a long transcript, you can inspect a run as a graph: branches, revisions, decisions, token/depth stats, and comparisons.
```

```text
2/ The first version is browser-only and runs demo traces without API keys.

It also supports Anthropic, OpenAI, Gemini, Ollama, and custom OpenAI-compatible endpoints for live runs.
```

```text
3/ The important boundary: Phosphene does not promise private raw chain-of-thought.

The useful surface is observable agent behavior, redacted traces, tool boundaries, policy decisions, and failure paths.
```

```text
4/ It now exposes parser and graph package entries, plus a local Constitution bridge prototype for testing rules against reasoning traces.

Demo: https://reyk-zepper.github.io/phosphene/
Repo: https://github.com/reyk-zepper/phosphene
```

## GitHub Org Handoff

When the user is ready to create `phosphene-ai`, either use the GitHub UI or
refresh local auth with org-admin scope:

```bash
gh auth refresh -h github.com -s admin:org
```

After the org exists:

```bash
gh repo create phosphene-ai/phosphene --public --source /Users/reykz/repositorys/phosphene --remote phosphene-ai
gh repo create phosphene-ai/constitution --public --source /Users/reykz/repositorys/constitution --remote phosphene-ai
```

Before pushing to the org, decide whether `reyk-zepper/phosphene` stays the
canonical repo or becomes a mirror.
