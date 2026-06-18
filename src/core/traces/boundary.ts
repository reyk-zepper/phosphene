import type {
  BoundaryTraceSchemaVersion,
  NodeTrace,
  NodeTraceEvent,
  TraceEventType,
  TraceLink,
  TraceRisk,
  TraceSource,
  TraceStatus,
} from './types';
import { createNodeTraceSummary } from './summary';

export interface BoundaryTraceEvent {
  trace_id: string;
  run_id: string;
  source: TraceSource;
  event_type: TraceEventType;
  actor?: string;
  tool?: string;
  decision?: string;
  risk?: TraceRisk;
  status: TraceStatus;
  timestamp: string;
  summary: string;
  redacted_payload_hash?: string;
  parent_event_id?: string | null;
  links?: TraceLink[];
}

export interface BoundaryTraceMetadata {
  id: string;
  title: string;
  subtitle?: string;
  status: TraceStatus;
}

export interface BoundaryTraceBundle {
  schema_version: BoundaryTraceSchemaVersion;
  metadata: BoundaryTraceMetadata;
  events: BoundaryTraceEvent[];
}

function boundaryEventDetail(event: BoundaryTraceEvent): string {
  const lines = [event.summary];
  const decision = event.decision ? `Decision: ${event.decision}.` : undefined;
  const risk = event.risk ? `Risk: ${event.risk}.` : undefined;
  const payload = event.redacted_payload_hash
    ? `Payload proof: ${event.redacted_payload_hash}.`
    : undefined;
  const context = [decision, risk, payload].filter(Boolean);

  if (context.length > 0) {
    lines.push('');
    lines.push(context.join(' '));
  }

  if (event.links && event.links.length > 0) {
    lines.push('');
    lines.push('Links:');
    for (const link of event.links) {
      lines.push(`- ${link.label}: ${link.href}`);
    }
  }

  return lines.join('\n');
}

export function boundaryEventToNodeTraceEvent(event: BoundaryTraceEvent): NodeTraceEvent {
  return {
    id: event.trace_id,
    parentEventId: event.parent_event_id ?? undefined,
    runId: event.run_id,
    source: event.source,
    eventType: event.event_type,
    actor: event.actor,
    tool: event.tool,
    decision: event.decision,
    risk: event.risk,
    status: event.status,
    timestamp: event.timestamp,
    summary: event.summary,
    detail: boundaryEventDetail(event),
    redactedPayloadHash: event.redacted_payload_hash,
    links: event.links,
  };
}

export function boundaryEventsToNodeTrace(
  events: BoundaryTraceEvent[],
  metadata: BoundaryTraceMetadata,
  schemaVersion?: BoundaryTraceSchemaVersion
): NodeTrace {
  if (events.length === 0) {
    throw new Error(`Boundary trace ${metadata.id} must contain at least one event`);
  }

  const orderedEvents = [...events].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );
  const nodeEvents = orderedEvents.map(boundaryEventToNodeTraceEvent);

  return {
    id: metadata.id,
    schemaVersion,
    title: metadata.title,
    subtitle: metadata.subtitle,
    status: metadata.status,
    startedAt: orderedEvents[0].timestamp,
    summary: createNodeTraceSummary({ events: nodeEvents, status: metadata.status }),
    events: nodeEvents,
  };
}
