import {
  boundaryEventsToNodeTrace,
  type BoundaryTraceEvent,
  type BoundaryTraceMetadata,
} from './boundary';
import {
  TRACE_EVENT_TYPES,
  TRACE_RISKS,
  TRACE_SOURCES,
  TRACE_STATUSES,
  type NodeTrace,
  type TraceLink,
  type TraceStatus,
} from './types';

export type BoundaryTraceImportResult =
  | { ok: true; trace: NodeTrace }
  | { ok: false; errors: string[] };

const sensitivePatterns: Array<{ id: string; pattern: RegExp }> = [
  { id: 'email_address', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  {
    id: 'token_or_secret_keyword',
    pattern:
      /\b(?:bearer|oauth|api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|session[_-]?cookie)\b/i,
  },
  { id: 'api_key', pattern: /sk-[A-Za-z0-9_-]{12,}/ },
  { id: 'slack_token', pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { id: 'private_key', pattern: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
  {
    id: 'private_url',
    pattern:
      /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|[^/\s]+\.local)\b/i,
  },
  {
    id: 'raw_provider_id',
    pattern: /\b(?:openai|anthropic|google|gemini|claude|gpt)[/:][A-Za-z0-9._-]+\b/i,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalString(value: unknown): string | undefined {
  return isString(value) ? value : undefined;
}

function enumError(name: string, values: readonly string[]): string {
  return `${name} must be one of: ${values.join(', ')}`;
}

function hasEnumValue<T extends string>(values: readonly T[], value: string): value is T {
  return values.includes(value as T);
}

function sanitizeIdStem(fileName: string): string {
  const file = fileName.trim().split(/[\\/]/).pop() ?? 'trace';
  const stem = file.replace(/\.[^.]+$/, '') || 'trace';
  return stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'trace';
}

function readLinks(value: unknown, path: string, errors: string[]): TraceLink[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return undefined;
  }

  const links: TraceLink[] = [];
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`${path}[${index}] must be an object`);
      return;
    }
    const label = optionalString(item.label);
    const href = optionalString(item.href);
    if (!label) errors.push(`${path}[${index}].label must be a non-empty string`);
    if (!href) errors.push(`${path}[${index}].href must be a non-empty string`);
    if (label && href) links.push({ label, href });
  });

  return links;
}

function readMetadata(
  raw: unknown,
  fileName: string,
  fallbackStatus: TraceStatus | undefined,
  errors: string[]
): BoundaryTraceMetadata {
  const metadata: BoundaryTraceMetadata = {
    id: `imported-${sanitizeIdStem(fileName)}`,
    title: fileName.trim() || 'Imported Boundary trace',
    status: fallbackStatus ?? 'running',
  };

  if (raw == null) return metadata;
  if (!isRecord(raw)) {
    errors.push('metadata must be an object when provided');
    return metadata;
  }

  const id = optionalString(raw.id);
  const title = optionalString(raw.title);
  const subtitle = optionalString(raw.subtitle);
  const status = optionalString(raw.status);

  if (id) metadata.id = id;
  if (title) metadata.title = title;
  if (subtitle) metadata.subtitle = subtitle;
  if (status && hasEnumValue(TRACE_STATUSES, status)) {
    metadata.status = status;
  } else if (status) {
    errors.push(enumError('metadata.status', TRACE_STATUSES));
  }

  return metadata;
}

function readEvent(raw: unknown, index: number, errors: string[]): BoundaryTraceEvent | null {
  const path = `events[${index}]`;
  if (!isRecord(raw)) {
    errors.push(`${path} must be an object`);
    return null;
  }

  const traceId = optionalString(raw.trace_id);
  const runId = optionalString(raw.run_id);
  const source = optionalString(raw.source);
  const eventType = optionalString(raw.event_type);
  const status = optionalString(raw.status);
  const timestamp = optionalString(raw.timestamp);
  const summary = optionalString(raw.summary);
  const risk = optionalString(raw.risk);
  const parent = raw.parent_event_id;

  if (!traceId) errors.push(`${path}.trace_id must be a non-empty string`);
  if (!runId) errors.push(`${path}.run_id must be a non-empty string`);
  if (!source) errors.push(`${path}.source must be a non-empty string`);
  else if (!hasEnumValue(TRACE_SOURCES, source)) errors.push(enumError(`${path}.source`, TRACE_SOURCES));
  if (!eventType) errors.push(`${path}.event_type must be a non-empty string`);
  else if (!hasEnumValue(TRACE_EVENT_TYPES, eventType)) errors.push(enumError(`${path}.event_type`, TRACE_EVENT_TYPES));
  if (!status) errors.push(`${path}.status must be a non-empty string`);
  else if (!hasEnumValue(TRACE_STATUSES, status)) errors.push(enumError(`${path}.status`, TRACE_STATUSES));
  if (!timestamp) errors.push(`${path}.timestamp must be a non-empty string`);
  else if (Number.isNaN(Date.parse(timestamp))) errors.push(`${path}.timestamp must be a valid ISO timestamp`);
  if (!summary) errors.push(`${path}.summary must be a non-empty string`);
  if (risk && !hasEnumValue(TRACE_RISKS, risk)) errors.push(enumError(`${path}.risk`, TRACE_RISKS));
  if (parent != null && typeof parent !== 'string') {
    errors.push(`${path}.parent_event_id must be a string or null`);
  }

  const links = readLinks(raw.links, `${path}.links`, errors);
  if (
    !traceId ||
    !runId ||
    !source ||
    !hasEnumValue(TRACE_SOURCES, source) ||
    !eventType ||
    !hasEnumValue(TRACE_EVENT_TYPES, eventType) ||
    !status ||
    !hasEnumValue(TRACE_STATUSES, status) ||
    !timestamp ||
    Number.isNaN(Date.parse(timestamp)) ||
    !summary ||
    (risk != null && !hasEnumValue(TRACE_RISKS, risk)) ||
    (parent != null && typeof parent !== 'string')
  ) {
    return null;
  }

  return {
    trace_id: traceId,
    run_id: runId,
    source,
    event_type: eventType,
    actor: optionalString(raw.actor),
    tool: optionalString(raw.tool),
    decision: optionalString(raw.decision),
    risk,
    status,
    timestamp,
    summary,
    redacted_payload_hash: optionalString(raw.redacted_payload_hash),
    parent_event_id: parent ?? null,
    links,
  };
}

function validateRedaction(value: unknown): string[] {
  const serialized = JSON.stringify(value);
  return sensitivePatterns
    .filter(({ pattern }) => pattern.test(serialized))
    .map(({ id }) => `Trace data contains forbidden sensitive pattern: ${id}`);
}

function extractEvents(value: unknown, errors: string[]): { events: unknown[]; metadata: unknown } | null {
  if (Array.isArray(value)) return { events: value, metadata: undefined };
  if (!isRecord(value)) {
    errors.push('Boundary JSON must be an event array or an object with an events array');
    return null;
  }
  if (!Array.isArray(value.events)) {
    errors.push('Boundary JSON object must contain an events array');
    return null;
  }
  return { events: value.events, metadata: value.metadata };
}

function validateEventGraph(events: BoundaryTraceEvent[], rawEvents: unknown[], errors: string[]): void {
  const ids = new Set<string>();
  const runIds = new Set<string>();
  let rootCount = 0;

  events.forEach((event, index) => {
    if (ids.has(event.trace_id)) errors.push(`events[${index}].trace_id is duplicated: ${event.trace_id}`);
    ids.add(event.trace_id);
    runIds.add(event.run_id);
    if (!event.parent_event_id) rootCount += 1;
  });

  rawEvents.forEach((event, index) => {
    if (!isRecord(event)) return;
    const parent = event.parent_event_id;
    if (typeof parent === 'string' && !ids.has(parent)) {
      errors.push(`events[${index}].parent_event_id references missing event: ${parent}`);
    }
  });

  if (runIds.size !== 1) errors.push('Boundary trace must contain exactly one run_id');
  if (rootCount !== 1) errors.push('Boundary trace must contain exactly one root event');
}

function uniqueErrors(errors: string[]): string[] {
  return [...new Set(errors)];
}

export function parseBoundaryTraceJson(
  input: string,
  fileName = 'Imported Boundary trace'
): BoundaryTraceImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parse error';
    return { ok: false, errors: [`Invalid JSON: ${message}`] };
  }

  const errors = validateRedaction(parsed);
  const extracted = extractEvents(parsed, errors);
  if (!extracted) return { ok: false, errors: uniqueErrors(errors) };
  if (extracted.events.length === 0) errors.push('Boundary trace must contain at least one event');

  const events = extracted.events
    .map((event, index) => readEvent(event, index, errors))
    .filter((event): event is BoundaryTraceEvent => event !== null);

  if (events.length > 0) validateEventGraph(events, extracted.events, errors);
  const fallbackStatus = [...events].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).at(-1)?.status;
  const metadata = readMetadata(extracted.metadata, fileName, fallbackStatus, errors);

  if (errors.length > 0) return { ok: false, errors: uniqueErrors(errors) };
  return { ok: true, trace: boundaryEventsToNodeTrace(events, metadata) };
}
