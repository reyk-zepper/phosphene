import type {
  NodeTraceEvent,
  NodeTraceSummary,
  TraceRisk,
  TraceSource,
  TraceStatus,
} from './types';

const RISK_RANK: Record<TraceRisk, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

interface TraceSummaryInput {
  events: NodeTraceEvent[];
  status?: TraceStatus;
}

function orderedSources(events: NodeTraceEvent[]): TraceSource[] {
  return [...new Set(events.map((event) => event.source))];
}

function highestRisk(events: NodeTraceEvent[]): TraceRisk | undefined {
  return events.reduce<TraceRisk | undefined>((highest, event) => {
    if (!event.risk) return highest;
    if (!highest || RISK_RANK[event.risk] > RISK_RANK[highest]) return event.risk;
    return highest;
  }, undefined);
}

function durationMs(events: NodeTraceEvent[]): number {
  const timestamps = events
    .map((event) => Date.parse(event.timestamp))
    .filter((timestamp) => !Number.isNaN(timestamp));

  if (timestamps.length < 2) return 0;
  return Math.max(...timestamps) - Math.min(...timestamps);
}

export function createNodeTraceSummary(input: TraceSummaryInput): NodeTraceSummary {
  const lastEvent = [...input.events].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  ).at(-1);

  return {
    eventCount: input.events.length,
    sources: orderedSources(input.events),
    highestRisk: highestRisk(input.events),
    decisionCount: input.events.filter((event) => event.decision).length,
    approvalCount: input.events.filter((event) => event.eventType === 'approval.required').length,
    failureCount: input.events.filter((event) => event.status === 'failed').length,
    recoveryCount: input.events.filter((event) => event.eventType === 'sentinel.recovery').length,
    terminalStatus: input.status ?? lastEvent?.status ?? 'running',
    durationMs: durationMs(input.events),
  };
}
