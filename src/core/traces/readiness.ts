import type { ObserverTraceGroup } from '@/constants/demoTraces';
import type { TraceIntakeBatchResult } from './intake';

export type ObserverReadinessStatus = 'ready' | 'partial' | 'not_connected';

export interface ObserverReadinessItem {
  id: 'boundary_contract' | 'handoff_intake' | 'published_snapshot' | 'ai_node_live_adapter';
  label: string;
  status: ObserverReadinessStatus;
  detail: string;
}

export interface PublishedSnapshotReadinessInput {
  status: 'available' | 'partial' | 'blocked' | 'unavailable';
  traceCount: number;
  blockedCount: number;
}

export interface ObserverReadinessInput {
  traceGroups: ObserverTraceGroup[];
  importedTraceCount: number;
  intakeResult?: TraceIntakeBatchResult;
  publishedSnapshot?: PublishedSnapshotReadinessInput;
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

function snapshotStatus(snapshot: PublishedSnapshotReadinessInput | undefined): ObserverReadinessStatus {
  if (!snapshot || snapshot.status === 'unavailable') return 'not_connected';
  if (snapshot.status === 'available') return 'ready';
  return 'partial';
}

function snapshotDetail(snapshot: PublishedSnapshotReadinessInput | undefined): string {
  if (!snapshot) return 'Snapshot pending';
  if (snapshot.status === 'unavailable') return 'No published snapshot';
  if (snapshot.status === 'blocked') return 'Snapshot blocked';
  if (snapshot.status === 'partial') return `${snapshot.traceCount} published · ${snapshot.blockedCount} blocked`;
  return `${snapshot.traceCount} published traces`;
}

export function createObserverReadiness({
  traceGroups,
  importedTraceCount,
  intakeResult,
  publishedSnapshot,
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
      id: 'published_snapshot',
      label: 'Published Snapshot',
      status: snapshotStatus(publishedSnapshot),
      detail: snapshotDetail(publishedSnapshot),
    },
    {
      id: 'ai_node_live_adapter',
      label: 'AI Node Live Adapter',
      status: 'not_connected',
      detail: 'AI Node adapter pending',
    },
  ];
}
