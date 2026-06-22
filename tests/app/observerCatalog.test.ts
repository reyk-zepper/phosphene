import { describe, expect, it } from 'vitest';
import type { ObserverTraceGroup } from '@/constants/demoTraces';
import type { NodeTrace } from '@/core/traces/types';
import { createObserverTraceCatalog } from '@/app/observerCatalog';

function trace(id: string): NodeTrace {
  return {
    id,
    title: id,
    events: [],
    status: 'succeeded',
  };
}

function group(id: string, traces: NodeTrace[]): ObserverTraceGroup {
  return {
    id,
    label: id,
    badge: id,
    description: id,
    traces,
  };
}

describe('createObserverTraceCatalog', () => {
  it('keeps imported traces from duplicating traces in visible observer groups', () => {
    const imported = trace('boundary-sentinel-recovery-001');
    const catalog = createObserverTraceCatalog({
      importedTraces: [imported],
      dynamicGroups: [],
      staticGroups: [
        group('Hermes Synthetic Handoffs 2026-06-18', [
          trace('boundary-sentinel-recovery-001'),
          trace('boundary-hermes-worker-001'),
        ]),
      ],
    });

    expect(catalog.traces.map((item) => item.id)).toEqual([
      'boundary-sentinel-recovery-001',
      'boundary-hermes-worker-001',
    ]);
    expect(catalog.traceGroups[0].traces.map((item) => item.id)).toEqual([
      'boundary-hermes-worker-001',
    ]);
  });

  it('lets dynamic snapshot groups replace duplicate static handoff traces', () => {
    const catalog = createObserverTraceCatalog({
      importedTraces: [],
      dynamicGroups: [
        group('Published AI Node Snapshot', [
          trace('run-hermes-aag-draft-synthetic-20260619'),
        ]),
      ],
      staticGroups: [
        group('Hermes Synthetic Handoffs 2026-06-19', [
          trace('run-hermes-aag-draft-synthetic-20260619'),
          trace('run-sentinel-recovery-synthetic-20260619'),
        ]),
      ],
    });

    expect(catalog.traceGroups.map((item) => item.label)).toEqual([
      'Published AI Node Snapshot',
      'Hermes Synthetic Handoffs 2026-06-19',
    ]);
    expect(catalog.traceGroups[1].traces.map((item) => item.id)).toEqual([
      'run-sentinel-recovery-synthetic-20260619',
    ]);
  });
});
