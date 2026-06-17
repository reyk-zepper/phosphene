export const TRACE_SOURCES = ['hermes', 'openclaw', 'aag', 'sentinel'] as const;
export type TraceSource = (typeof TRACE_SOURCES)[number];

export const TRACE_STATUSES = [
  'queued',
  'running',
  'needs_approval',
  'approved',
  'denied',
  'succeeded',
  'failed',
  'recovered',
] as const;
export type TraceStatus = (typeof TRACE_STATUSES)[number];

export const TRACE_RISKS = ['low', 'medium', 'high'] as const;
export type TraceRisk = (typeof TRACE_RISKS)[number];

export const TRACE_EVENT_TYPES = [
  'run.started',
  'agent.plan',
  'tool.requested',
  'tool.executed',
  'aag.decision',
  'approval.required',
  'worker.started',
  'worker.completed',
  'health.check',
  'sentinel.alert',
  'sentinel.recovery',
  'run.completed',
] as const;
export type TraceEventType = (typeof TRACE_EVENT_TYPES)[number];

export interface TraceLink {
  label: string;
  href: string;
}

export interface NodeTraceEvent {
  id: string;
  parentEventId?: string;
  runId: string;
  source: TraceSource;
  eventType: TraceEventType;
  actor?: string;
  tool?: string;
  decision?: string;
  risk?: TraceRisk;
  status: TraceStatus;
  timestamp: string;
  summary: string;
  detail: string;
  redactedPayloadHash?: string;
  links?: TraceLink[];
}

export interface NodeTrace {
  id: string;
  title: string;
  subtitle?: string;
  status: TraceStatus;
  startedAt: string;
  events: NodeTraceEvent[];
}
