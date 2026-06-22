import type { ObserverTraceGroup } from '@/constants/demoTraces';
import type { NodeTrace } from '@/core/traces/types';

interface ObserverTraceCatalogInput {
  importedTraces: NodeTrace[];
  dynamicGroups: Array<ObserverTraceGroup | undefined>;
  staticGroups: ObserverTraceGroup[];
}

interface ObserverTraceCatalog {
  traceGroups: ObserverTraceGroup[];
  traces: NodeTrace[];
}

function uniqueTraces(traces: NodeTrace[]): NodeTrace[] {
  const seen = new Set<string>();
  return traces.filter((trace) => {
    if (seen.has(trace.id)) return false;
    seen.add(trace.id);
    return true;
  });
}

function filterGroup(group: ObserverTraceGroup, excludedIds: Set<string>): ObserverTraceGroup {
  return {
    ...group,
    traces: group.traces.filter((trace) => !excludedIds.has(trace.id)),
  };
}

export function createObserverTraceCatalog({
  importedTraces,
  dynamicGroups,
  staticGroups,
}: ObserverTraceCatalogInput): ObserverTraceCatalog {
  const imported = uniqueTraces(importedTraces);
  const importedIds = new Set(imported.map((trace) => trace.id));
  const visibleDynamicGroups = dynamicGroups
    .filter((group): group is ObserverTraceGroup => Boolean(group))
    .map((group) => filterGroup(group, importedIds))
    .filter((group) => group.traces.length > 0);

  const dynamicTraceIds = new Set(visibleDynamicGroups.flatMap((group) => group.traces.map((trace) => trace.id)));
  const staticExcludedIds = new Set([...importedIds, ...dynamicTraceIds]);
  const visibleStaticGroups = staticGroups
    .map((group) => filterGroup(group, staticExcludedIds))
    .filter((group) => group.traces.length > 0);
  const traceGroups = [...visibleDynamicGroups, ...visibleStaticGroups];

  return {
    traceGroups,
    traces: uniqueTraces([...imported, ...traceGroups.flatMap((group) => group.traces)]),
  };
}
