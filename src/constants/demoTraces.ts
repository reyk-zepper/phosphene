import {
  boundaryEventsToNodeTrace,
  type BoundaryTraceBundle,
  type BoundaryTraceEvent,
} from '@/core/traces/boundary';
import type { NodeTrace } from '@/core/traces/types';
import gmailDraftBundle from '@/core/traces/demo/hermes-aag-gmail-draft.json';
import openClawWorkerBundle from '@/core/traces/demo/hermes-openclaw-worker.json';
import workspaceBundleBundle from '@/core/traces/demo/aag-google-workspace-bundle.json';
import sentinelRecoveryBundle from '@/core/traces/demo/sentinel-failure-recovery.json';
import handoffWorkspaceBundle from '@/core/traces/handoffs/hermes-synthetic-2026-06-18/aag-workspace-bundle.synthetic.json';
import handoffGmailDraftBundle from '@/core/traces/handoffs/hermes-synthetic-2026-06-18/hermes-aag-gmail-draft.synthetic.json';
import handoffOpenClawWorkerBundle from '@/core/traces/handoffs/hermes-synthetic-2026-06-18/hermes-openclaw-worker.synthetic.json';
import handoffSentinelRecoveryBundle from '@/core/traces/handoffs/hermes-synthetic-2026-06-18/sentinel-recovery.synthetic.json';

export interface ObserverTraceGroup {
  id: string;
  label: string;
  badge: string;
  description: string;
  traces: NodeTrace[];
}

export const BOUNDARY_DEMO_TRACES = [
  gmailDraftBundle as BoundaryTraceBundle,
  openClawWorkerBundle as BoundaryTraceBundle,
  workspaceBundleBundle as BoundaryTraceBundle,
  sentinelRecoveryBundle as BoundaryTraceBundle,
] as const;

export const BOUNDARY_HANDOFF_TRACES = [
  handoffGmailDraftBundle as BoundaryTraceBundle,
  handoffOpenClawWorkerBundle as BoundaryTraceBundle,
  handoffWorkspaceBundle as BoundaryTraceBundle,
  handoffSentinelRecoveryBundle as BoundaryTraceBundle,
] as const;

export const BOUNDARY_OBSERVER_TRACES = [
  ...BOUNDARY_DEMO_TRACES,
  ...BOUNDARY_HANDOFF_TRACES,
] as const;

function normalizeTrace({ schema_version, metadata, events }: BoundaryTraceBundle): NodeTrace {
  return boundaryEventsToNodeTrace(events as BoundaryTraceEvent[], metadata, schema_version);
}

export const DEMO_TRACES: NodeTrace[] = BOUNDARY_DEMO_TRACES.map(normalizeTrace);

export const HANDOFF_TRACES: NodeTrace[] = BOUNDARY_HANDOFF_TRACES.map(normalizeTrace);

export const OBSERVER_TRACE_GROUPS: ObserverTraceGroup[] = [
  {
    id: 'built-in-demo-traces',
    label: 'Built-in Demo Traces',
    badge: 'Redacted demo traces',
    description: 'Static v0.1 scenarios shipped with Phosphene for safe demos.',
    traces: DEMO_TRACES,
  },
  {
    id: 'hermes-synthetic-handoffs',
    label: 'Hermes Synthetic Handoffs',
    badge: 'Synthetic handoff',
    description: 'AI-node-generated synthetic Boundary handoffs imported from Hermes output.',
    traces: HANDOFF_TRACES,
  },
];

export const OBSERVER_TRACES: NodeTrace[] = OBSERVER_TRACE_GROUPS.flatMap((group) => group.traces);

export const OBSERVER_TRACE_BADGES = new Map(
  OBSERVER_TRACE_GROUPS.flatMap((group) => group.traces.map((trace) => [trace.id, group.badge] as const))
);

export const OBSERVER_TRACE_DESCRIPTIONS = new Map(
  OBSERVER_TRACE_GROUPS.flatMap((group) => group.traces.map((trace) => [trace.id, group.description] as const))
);

export function getDemoTrace(id: string): NodeTrace | undefined {
  return OBSERVER_TRACES.find((trace) => trace.id === id);
}
