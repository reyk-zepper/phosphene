#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 'phosphene.boundary.v0.1.2';
const SOURCES = new Set(['hermes', 'openclaw', 'aag', 'sentinel']);
const STATUSES = new Set([
  'queued',
  'running',
  'needs_approval',
  'approved',
  'denied',
  'succeeded',
  'failed',
  'recovered',
]);
const RISKS = new Set(['low', 'medium', 'high']);
const EVENT_TYPES = new Set([
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
]);
const FORBIDDEN = [
  ['email_address', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  [
    'token_or_secret_keyword',
    /\b(?:bearer|oauth|api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|session[_-]?cookie)\b/i,
  ],
  ['api_key', /sk-[A-Za-z0-9_-]{12,}/],
  ['slack_token', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['private_key', /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/],
  [
    'private_url',
    /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|[^/\s]+\.local)\b/i,
  ],
  ['raw_provider_id', /\b(?:openai|anthropic|google|gemini|claude|gpt)[/:][A-Za-z0-9._-]+\b/i],
];

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function collectJsonFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return target.endsWith('.json') ? [target] : [];
  if (!stat.isDirectory()) return [];

  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) return collectJsonFiles(child);
    return entry.isFile() && entry.name.endsWith('.json') ? [child] : [];
  });
}

function validateFile(file) {
  const errors = [];
  const raw = fs.readFileSync(file, 'utf8');
  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    return [`Invalid JSON: ${error instanceof Error ? error.message : 'unknown parse error'}`];
  }

  if (!isRecord(data)) {
    errors.push('Boundary JSON must be an object');
    return errors;
  }
  if (data.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (!isRecord(data.metadata)) errors.push('metadata must be an object');
  if (!Array.isArray(data.events)) errors.push('events must be an array');

  if (isRecord(data.metadata)) {
    if (!isNonEmptyString(data.metadata.id)) errors.push('metadata.id must be a non-empty string');
    if (!isNonEmptyString(data.metadata.title)) errors.push('metadata.title must be a non-empty string');
    if (!STATUSES.has(data.metadata.status)) errors.push('metadata.status must be an allowed status');
  }

  const events = Array.isArray(data.events) ? data.events : [];
  if (events.length === 0) errors.push('Boundary trace must contain at least one event');

  const ids = new Set();
  const runIds = new Set();
  let rootCount = 0;
  events.forEach((event, index) => {
    const prefix = `events[${index}]`;
    if (!isRecord(event)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    if (!isNonEmptyString(event.trace_id)) errors.push(`${prefix}.trace_id must be a non-empty string`);
    else if (ids.has(event.trace_id)) errors.push(`${prefix}.trace_id is duplicated: ${event.trace_id}`);
    else ids.add(event.trace_id);
    if (!isNonEmptyString(event.run_id)) errors.push(`${prefix}.run_id must be a non-empty string`);
    else runIds.add(event.run_id);
    if (!SOURCES.has(event.source)) errors.push(`${prefix}.source must be an allowed source`);
    if (!EVENT_TYPES.has(event.event_type)) errors.push(`${prefix}.event_type must be an allowed event type`);
    if (!STATUSES.has(event.status)) errors.push(`${prefix}.status must be an allowed status`);
    if ('risk' in event && !RISKS.has(event.risk)) errors.push(`${prefix}.risk must be an allowed risk`);
    if (!isNonEmptyString(event.timestamp) || Number.isNaN(Date.parse(event.timestamp))) {
      errors.push(`${prefix}.timestamp must be a valid ISO timestamp`);
    }
    if (!isNonEmptyString(event.summary)) errors.push(`${prefix}.summary must be a non-empty string`);
    if (!event.parent_event_id) rootCount += 1;
    if (event.parent_event_id != null && typeof event.parent_event_id !== 'string') {
      errors.push(`${prefix}.parent_event_id must be a string or null`);
    }
    if (event.links != null) {
      if (!Array.isArray(event.links)) {
        errors.push(`${prefix}.links must be an array`);
      } else {
        event.links.forEach((link, linkIndex) => {
          const linkPrefix = `${prefix}.links[${linkIndex}]`;
          if (!isRecord(link)) {
            errors.push(`${linkPrefix} must be an object`);
            return;
          }
          if (!isNonEmptyString(link.label)) errors.push(`${linkPrefix}.label must be a non-empty string`);
          if (!isNonEmptyString(link.href)) errors.push(`${linkPrefix}.href must be a non-empty string`);
        });
      }
    }
  });

  events.forEach((event, index) => {
    if (isRecord(event) && typeof event.parent_event_id === 'string' && !ids.has(event.parent_event_id)) {
      errors.push(`events[${index}].parent_event_id references missing event: ${event.parent_event_id}`);
    }
  });

  if (runIds.size !== 1) errors.push('Boundary trace must contain exactly one run_id');
  if (rootCount !== 1) errors.push('Boundary trace must contain exactly one root event');

  for (const [id, pattern] of FORBIDDEN) {
    if (pattern.test(raw)) errors.push(`Trace data contains forbidden sensitive pattern: ${id}`);
  }

  return [...new Set(errors)];
}

const targets = process.argv.slice(2).filter((target) => target !== '--');
if (targets.length === 0) {
  console.error('Usage: validate-boundary-traces <file-or-directory> [...]');
  process.exit(2);
}

const files = [...new Set(targets.flatMap((target) => collectJsonFiles(path.resolve(target))))].sort();
if (files.length === 0) {
  console.error('No JSON files found.');
  process.exit(2);
}

let failureCount = 0;
for (const file of files) {
  const errors = validateFile(file);
  if (errors.length === 0) {
    console.log(`PASS ${path.relative(process.cwd(), file)}`);
  } else {
    failureCount += 1;
    console.log(`FAIL ${path.relative(process.cwd(), file)}`);
    for (const error of errors) console.log(`  - ${error}`);
  }
}

console.log(`Validated ${files.length} file(s), ${failureCount} failed.`);
process.exit(failureCount > 0 ? 1 : 0);
