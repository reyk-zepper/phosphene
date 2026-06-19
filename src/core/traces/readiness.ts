import type { ObserverTraceGroup } from '@/constants/demoTraces';
import type { TraceIntakeBatchResult } from './intake';

export type ObserverReadinessStatus = 'ready' | 'partial' | 'not_connected';

export interface ObserverReadinessItem {
  id: 'boundary_contract' | 'handoff_intake' | 'ai_node_live_adapter';
  label: string;
  status: ObserverReadinessStatus;
  detail: string;
}

export interface ObserverReadinessInput {
  traceGroups: ObserverTraceGroup[];
  importedTraceCount: number;
  intakeResult?: TraceIntakeBatchResult;
}

function totalTraceCount(traceGroups: ObserverTraceGroup[]): number {
  return traceGroups.reduce((sum, group) => sum + group.traces.length, 0);
}

function handoffDetail(importedTraceCount: number, intakeResult: TraceIntakeBatchResult | undefined): string {
  if (!intakeResult) {
    return importedTraceCount > 0
      ? `${importedTraceCount} imported traces`
      : 'Local intake ready';
  }

  const blockedCount = intakeResult.summary.blockedTraceCount;
  return `${intakeResult.summary.acceptedTraceCount} imported · ${blockedCount} blocked`;
}

function handoffStatus(intakeResult: TraceIntakeBatchResult | undefined): ObserverReadinessStatus {
  if (!intakeResult || intakeResult.summary.overallStatus === 'passed') return 'ready';
  return 'partial';
}

export function createObserverReadiness({
  traceGroups,
  importedTraceCount,
  intakeResult,
}: ObserverReadinessInput): ObserverReadinessItem[] {
  return [
    {
      id: 'boundary_contract',
      label: 'Boundary Contract',
      status: 'ready',
      detail: `${totalTraceCount(traceGroups)} redacted traces available`,
    },
    {
      id: 'handoff_intake',
      label: 'Handoff Intake',
      status: handoffStatus(intakeResult),
      detail: handoffDetail(importedTraceCount, intakeResult),
    },
    {
      id: 'ai_node_live_adapter',
      label: 'AI Node Live Adapter',
      status: 'not_connected',
      detail: 'AI Node adapter pending',
    },
  ];
}
