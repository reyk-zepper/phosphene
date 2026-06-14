# Phosphene Node Observer v0.1 Design

## Purpose

Phosphene currently works as a reasoning graph prototype, but the deployed AI
Node needs an observer surface for Hermes, OpenClaw, AAG, and sentinels. The
next slice should make the product self-explanatory while avoiding false claims
that it already has live agent telemetry.

## Product Shape

The app gets two explicit modes:

- `Reasoning Lab`: the existing prompt-to-reasoning graph workflow.
- `Node Observer`: a new trace replay surface for AI-node behavior.

`Node Observer` starts with redacted sample traces, not live data. This creates
the UI and data contract that later live adapters can target.

## Data Model

Add a trace model separate from the existing LLM reasoning parser:

- trace: one agent run or operational incident
- event: one step inside that run
- source: `hermes`, `openclaw`, `aag`, or `sentinel`
- event type: run, plan, tool, approval, policy, worker, health, recovery
- relationship: parent event id for graph edges

The trace adapter converts this model into the existing `ReasoningGraph`
surface. Nodes can use the existing glow colors, but they need custom labels
such as `HERMES PLAN`, `AAG GATE`, and `OPENCLAW`.

## UI

The top shell exposes a compact mode switch. In `Reasoning Lab`, the existing
prompt input stays. In `Node Observer`, the prompt input is replaced by a run
picker and compact run status. The graph canvas and detail panel are reused.

The first version should not add tutorial copy. The interface should explain
itself through clear labels, run titles, event labels, status chips, and sample
trace names.

## Scope

In scope:

- app mode switch
- static trace data for AI-node scenarios
- trace-to-graph adapter
- custom node labels and metadata in detail panel
- tests for trace conversion and demo trace integrity
- build/test verification

Out of scope:

- live Hermes/OpenClaw/AAG streaming
- auth to AAG/Hermes
- backend server
- public Tailnet exposure
- exporting screenshots

## Success Criteria

- A user can tell there are two jobs: prompt reasoning and node observation.
- `Node Observer` displays AI-node traces without requiring API keys.
- The trace adapter has tests.
- `pnpm exec vitest run` finds and runs tests.
- `pnpm build` succeeds.
- The existing Mac-mini update script can deploy the result unchanged.
