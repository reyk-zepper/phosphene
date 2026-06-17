import { boundaryEventsToNodeTrace, type BoundaryTraceEvent } from '@/core/traces/boundary';
import type { NodeTrace } from '@/core/traces/types';
import gmailDraftEvents from '@/core/traces/demo/hermes-aag-gmail-draft.json';
import openClawWorkerEvents from '@/core/traces/demo/hermes-openclaw-worker.json';
import workspaceBundleEvents from '@/core/traces/demo/aag-google-workspace-bundle.json';
import sentinelRecoveryEvents from '@/core/traces/demo/sentinel-failure-recovery.json';

export const BOUNDARY_DEMO_TRACES = [
  {
    metadata: {
      id: 'trace-hermes-aag-gmail-draft',
      title: 'Hermes -> AAG -> Gmail Draft',
      subtitle: 'Redacted demo: draft creation is gated before provider side effects',
      status: 'needs_approval',
    },
    events: gmailDraftEvents,
  },
  {
    metadata: {
      id: 'trace-hermes-openclaw-worker',
      title: 'Hermes -> OpenClaw Worker',
      subtitle: 'Redacted demo: bounded worker delegation through an adapter boundary',
      status: 'succeeded',
    },
    events: openClawWorkerEvents,
  },
  {
    metadata: {
      id: 'trace-aag-google-workspace-bundle',
      title: 'AAG Google Workspace Bundle',
      subtitle: 'Redacted demo: bundled Workspace changes require operator approval',
      status: 'needs_approval',
    },
    events: workspaceBundleEvents,
  },
  {
    metadata: {
      id: 'trace-sentinel-failure-recovery',
      title: 'Sentinel Failure / Recovery',
      subtitle: 'Redacted demo: health failure and recovery become visible',
      status: 'recovered',
    },
    events: sentinelRecoveryEvents,
  },
] as const;

export const DEMO_TRACES: NodeTrace[] = BOUNDARY_DEMO_TRACES.map(({ metadata, events }) =>
  boundaryEventsToNodeTrace(events as BoundaryTraceEvent[], metadata)
);

export function getDemoTrace(id: string): NodeTrace | undefined {
  return DEMO_TRACES.find((trace) => trace.id === id);
}
