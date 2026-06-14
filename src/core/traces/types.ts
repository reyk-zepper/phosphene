export type TraceSource = 'hermes' | 'openclaw' | 'aag' | 'sentinel';

export type TraceStatus =
  | 'queued'
  | 'running'
  | 'needs_approval'
  | 'approved'
  | 'denied'
  | 'succeeded'
  | 'failed'
  | 'recovered';

export type TraceRisk = 'low' | 'medium' | 'high';

export type TraceEventType =
  | 'run.started'
  | 'agent.plan'
  | 'tool.requested'
  | 'tool.executed'
  | 'aag.decision'
  | 'approval.required'
  | 'worker.started'
  | 'worker.completed'
  | 'health.check'
  | 'sentinel.alert'
  | 'sentinel.recovery'
  | 'run.completed';

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
  links?: Array<{
    label: string;
    href: string;
  }>;
}

export interface NodeTrace {
  id: string;
  title: string;
  subtitle?: string;
  status: TraceStatus;
  startedAt: string;
  events: NodeTraceEvent[];
}
