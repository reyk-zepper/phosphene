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

export const BOUNDARY_DEMO_TRACES = [
  gmailDraftBundle as BoundaryTraceBundle,
  openClawWorkerBundle as BoundaryTraceBundle,
  workspaceBundleBundle as BoundaryTraceBundle,
  sentinelRecoveryBundle as BoundaryTraceBundle,
] as const;

export const DEMO_TRACES: NodeTrace[] = BOUNDARY_DEMO_TRACES.map(({ schema_version, metadata, events }) =>
  boundaryEventsToNodeTrace(events as BoundaryTraceEvent[], metadata, schema_version)
);

export function getDemoTrace(id: string): NodeTrace | undefined {
  return DEMO_TRACES.find((trace) => trace.id === id);
}
