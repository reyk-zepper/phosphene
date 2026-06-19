import { describe, expect, it } from 'vitest';
import { OBSERVER_TRACE_GROUPS } from '@/constants/demoTraces';
import { createObserverReadiness } from '@/core/traces/readiness';
import type { TraceIntakeBatchResult } from '@/core/traces/intake';

describe('createObserverReadiness', () => {
  it('reports demo-ready Boundary and Handoff status while keeping the AI Node live adapter disconnected', () => {
    const readiness = createObserverReadiness({
      traceGroups: OBSERVER_TRACE_GROUPS,
      importedTraceCount: 0,
    });

    expect(readiness.map((item) => [item.id, item.status])).toEqual([
      ['boundary_contract', 'ready'],
      ['handoff_intake', 'ready'],
      ['ai_node_live_adapter', 'not_connected'],
    ]);
    expect(readiness[0].detail).toBe('8 redacted traces available');
    expect(readiness[2].detail).toBe('AI Node adapter pending');
  });

  it('marks handoff intake partial when a selected batch has blocked files', () => {
    const intakeResult = {
      traces: [],
      items: [],
      summary: {
        totalFiles: 3,
        acceptedTraceCount: 1,
        blockedTraceCount: 1,
        supportFileCount: 1,
        ignoredFileCount: 0,
        overallStatus: 'partial',
      },
    } satisfies TraceIntakeBatchResult;

    const readiness = createObserverReadiness({
      traceGroups: OBSERVER_TRACE_GROUPS,
      importedTraceCount: 1,
      intakeResult,
    });

    expect(readiness.find((item) => item.id === 'handoff_intake')).toMatchObject({
      status: 'partial',
      detail: '1 imported · 1 blocked',
    });
  });
});
