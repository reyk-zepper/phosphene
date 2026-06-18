import {
  BOUNDARY_TRACE_SCHEMA_VERSION,
  TRACE_EVENT_TYPES,
  TRACE_RISKS,
  TRACE_SOURCES,
  TRACE_STATUSES,
  type BoundaryTraceSchemaVersion,
  type TraceEventType,
  type TraceLink,
  type TraceRisk,
  type TraceSource,
  type TraceStatus,
} from './types';
import type { BoundaryTraceBundle, BoundaryTraceEvent, BoundaryTraceMetadata } from './boundary';

export type BoundaryValidationCheckId =
  | 'json'
  | 'schema_version'
  | 'shape'
  | 'enums'
  | 'graph'
  | 'redaction';

export type BoundaryValidationCheckStatus = 'passed' | 'failed';

export interface BoundaryValidationCheck {
  id: BoundaryValidationCheckId;
  status: BoundaryValidationCheckStatus;
  message: string;
}

export interface BoundaryValidationResult {
  ok: boolean;
  fileName: string;
  checks: BoundaryValidationCheck[];
  errors: string[];
  parsed?: unknown;
  bundle?: BoundaryTraceBundle;
}

const CHECK_ORDER: BoundaryValidationCheckId[] = [
  'json',
  'schema_version',
  'shape',
  'enums',
  'graph',
  'redaction',
];

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

function addCheck(
  checks: BoundaryValidationCheck[],
  id: BoundaryValidationCheckId,
  failed: boolean,
  passMessage: string,
  failMessage: string
): void {
  checks.push({
    id,
    status: failed ? 'failed' : 'passed',
    message: failed ? failMessage : passMessage,
  });
}

function shapeError(errors: string[], path: string, message: string): void {
  errors.push(`${path} ${message}`);
}

function readLinks(value: unknown, path: string, shapeErrors: string[]): TraceLink[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) {
    shapeErrors.push(`${path} must be an array`);
    return undefined;
  }

  const links: TraceLink[] = [];
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      shapeErrors.push(`${path}[${index}] must be an object`);
      return;
    }

    const label = optionalString(item.label);
    const href = optionalString(item.href);
    if (!label) shapeErrors.push(`${path}[${index}].label must be a non-empty string`);
    if (!href) shapeErrors.push(`${path}[${index}].href must be a non-empty string`);
    if (label && href) links.push({ label, href });
  });

  return links;
}

function readMetadata(raw: unknown, shapeErrors: string[], enumErrors: string[]): BoundaryTraceMetadata | null {
  if (!isRecord(raw)) {
    shapeErrors.push('metadata must be an object');
    return null;
  }

  const id = optionalString(raw.id);
  const title = optionalString(raw.title);
  const subtitle = optionalString(raw.subtitle);
  const status = optionalString(raw.status);

  if (!id) shapeErrors.push('metadata.id must be a non-empty string');
  if (!title) shapeErrors.push('metadata.title must be a non-empty string');
  if (!status) {
    shapeErrors.push('metadata.status must be a non-empty string');
  } else if (!hasEnumValue(TRACE_STATUSES, status)) {
    enumErrors.push(enumError('metadata.status', TRACE_STATUSES));
  }

  if (!id || !title || !status || !hasEnumValue(TRACE_STATUSES, status)) return null;

  return {
    id,
    title,
    subtitle,
    status,
  };
}

function readEvent(
  raw: unknown,
  index: number,
  shapeErrors: string[],
  enumErrors: string[]
): BoundaryTraceEvent | null {
  const path = `events[${index}]`;
  if (!isRecord(raw)) {
    shapeError(shapeErrors, path, 'must be an object');
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

  if (!traceId) shapeErrors.push(`${path}.trace_id must be a non-empty string`);
  if (!runId) shapeErrors.push(`${path}.run_id must be a non-empty string`);
  if (!source) shapeErrors.push(`${path}.source must be a non-empty string`);
  else if (!hasEnumValue(TRACE_SOURCES, source)) enumErrors.push(enumError(`${path}.source`, TRACE_SOURCES));
  if (!eventType) shapeErrors.push(`${path}.event_type must be a non-empty string`);
  else if (!hasEnumValue(TRACE_EVENT_TYPES, eventType)) enumErrors.push(enumError(`${path}.event_type`, TRACE_EVENT_TYPES));
  if (!status) shapeErrors.push(`${path}.status must be a non-empty string`);
  else if (!hasEnumValue(TRACE_STATUSES, status)) enumErrors.push(enumError(`${path}.status`, TRACE_STATUSES));
  if (!timestamp) shapeErrors.push(`${path}.timestamp must be a non-empty string`);
  else if (Number.isNaN(Date.parse(timestamp))) shapeErrors.push(`${path}.timestamp must be a valid ISO timestamp`);
  if (!summary) shapeErrors.push(`${path}.summary must be a non-empty string`);
  if (risk && !hasEnumValue(TRACE_RISKS, risk)) enumErrors.push(enumError(`${path}.risk`, TRACE_RISKS));
  if (parent != null && typeof parent !== 'string') {
    shapeErrors.push(`${path}.parent_event_id must be a string or null`);
  }

  const links = readLinks(raw.links, `${path}.links`, shapeErrors);

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
    source: source as TraceSource,
    event_type: eventType as TraceEventType,
    actor: optionalString(raw.actor),
    tool: optionalString(raw.tool),
    decision: optionalString(raw.decision),
    risk: risk as TraceRisk | undefined,
    status: status as TraceStatus,
    timestamp,
    summary,
    redacted_payload_hash: optionalString(raw.redacted_payload_hash),
    parent_event_id: parent ?? null,
    links,
  };
}

function validateGraph(events: BoundaryTraceEvent[], rawEvents: unknown[]): string[] {
  const errors: string[] = [];
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
  return errors;
}

function validateRedaction(value: unknown): string[] {
  const serialized = JSON.stringify(value);
  return sensitivePatterns
    .filter(({ pattern }) => pattern.test(serialized))
    .map(({ id }) => `Trace data contains forbidden sensitive pattern: ${id}`);
}

function uniqueErrors(errors: string[]): string[] {
  return [...new Set(errors)];
}

export function validateBoundaryTraceJson(
  input: string,
  fileName = 'Boundary trace'
): BoundaryValidationResult {
  const checks: BoundaryValidationCheck[] = [];
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
    addCheck(checks, 'json', false, 'JSON parsed', 'Invalid JSON');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parse error';
    errors.push(`Invalid JSON: ${message}`);
    addCheck(checks, 'json', true, 'JSON parsed', 'Invalid JSON');
    for (const id of CHECK_ORDER.slice(1)) {
      addCheck(checks, id, true, `${id} passed`, `${id} skipped because JSON parsing failed`);
    }
    return { ok: false, fileName, checks, errors: uniqueErrors(errors) };
  }

  const schemaErrors: string[] = [];
  const shapeErrors: string[] = [];
  const enumErrors: string[] = [];
  let schemaVersion: BoundaryTraceSchemaVersion | undefined;
  let metadata: BoundaryTraceMetadata | null = null;
  let events: BoundaryTraceEvent[] = [];
  let rawEvents: unknown[] = [];

  if (!isRecord(parsed)) {
    shapeErrors.push('Boundary JSON must be an object with schema_version, metadata, and events');
  } else {
    if (parsed.schema_version !== BOUNDARY_TRACE_SCHEMA_VERSION) {
      schemaErrors.push(`schema_version must be ${BOUNDARY_TRACE_SCHEMA_VERSION}`);
    } else {
      schemaVersion = parsed.schema_version;
    }

    metadata = readMetadata(parsed.metadata, shapeErrors, enumErrors);

    if (!Array.isArray(parsed.events)) {
      shapeErrors.push('Boundary JSON object must contain an events array');
    } else if (parsed.events.length === 0) {
      shapeErrors.push('Boundary trace must contain at least one event');
    } else {
      rawEvents = parsed.events;
      events = parsed.events
        .map((event, index) => readEvent(event, index, shapeErrors, enumErrors))
        .filter((event): event is BoundaryTraceEvent => event !== null);
    }
  }

  errors.push(...schemaErrors, ...shapeErrors, ...enumErrors);
  addCheck(checks, 'schema_version', schemaErrors.length > 0, 'Schema version supported', 'Schema version rejected');
  addCheck(checks, 'shape', shapeErrors.length > 0, 'Required fields are present', 'Shape validation failed');
  addCheck(checks, 'enums', enumErrors.length > 0, 'Enum values are allowed', 'Enum validation failed');

  const graphErrors = events.length > 0 ? validateGraph(events, rawEvents) : [];
  errors.push(...graphErrors);
  addCheck(checks, 'graph', graphErrors.length > 0, 'Graph references are valid', 'Graph validation failed');

  const redactionErrors = validateRedaction(parsed);
  errors.push(...redactionErrors);
  addCheck(checks, 'redaction', redactionErrors.length > 0, 'No sensitive patterns detected', 'Redaction validation failed');

  const bundle = schemaVersion && metadata && errors.length === 0
    ? { schema_version: schemaVersion, metadata, events }
    : undefined;

  return {
    ok: errors.length === 0,
    fileName,
    checks,
    errors: uniqueErrors(errors),
    parsed,
    bundle,
  };
}
