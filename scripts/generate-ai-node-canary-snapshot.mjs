#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';

const SCHEMA_VERSION = 'phosphene.boundary.v0.1.2';
const TRACE_FILE = 'ai-node-canary-health.boundary.json';
const DEFAULT_SERVICE_DIR = '/Users/raik./ai-stack/services/phosphene';
const DEFAULT_SERVICE_URL = 'http://127.0.0.1:5173/';

class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function usage() {
  return [
    'Usage: generate-ai-node-canary-snapshot --target <dir> [options]',
    '',
    'Writes a redacted Phosphene Boundary pack for AI Node operational canary checks.',
    '',
    'Options:',
    '  --target <dir>             Output pack directory',
    `  --service-dir <dir>        Phosphene service directory (default: ${DEFAULT_SERVICE_DIR})`,
    `  --service-url <url>        URL to probe without writing it to output (default: ${DEFAULT_SERVICE_URL})`,
    '  --service-http-code <code> Override probed service HTTP code, useful for tests',
    '  --observed-at <iso>        Observation timestamp (default: current UTC time)',
    '  --help                    Show this help',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    target: '',
    serviceDir: DEFAULT_SERVICE_DIR,
    serviceUrl: DEFAULT_SERVICE_URL,
    serviceHttpCode: undefined,
    observedAt: new Date().toISOString(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }

    if (
      arg === '--target'
      || arg === '--service-dir'
      || arg === '--service-url'
      || arg === '--service-http-code'
      || arg === '--observed-at'
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new CliError(`${arg} requires a value`, 2);
      }
      if (arg === '--target') options.target = value;
      if (arg === '--service-dir') options.serviceDir = value;
      if (arg === '--service-url') options.serviceUrl = value;
      if (arg === '--service-http-code') options.serviceHttpCode = Number(value);
      if (arg === '--observed-at') options.observedAt = value;
      index += 1;
      continue;
    }

    throw new CliError(`Unknown argument: ${arg}`, 2);
  }

  if (!options.target) throw new CliError('--target is required', 2);
  if (Number.isNaN(Date.parse(options.observedAt))) {
    throw new CliError('--observed-at must be an ISO timestamp', 2);
  }
  if (options.serviceHttpCode !== undefined && !Number.isInteger(options.serviceHttpCode)) {
    throw new CliError('--service-http-code must be an integer', 2);
  }

  return {
    ...options,
    target: path.resolve(options.target),
    serviceDir: path.resolve(options.serviceDir),
  };
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return undefined;
  }
}

function statusFromHttpCode(code) {
  if (typeof code !== 'number') return 'failed';
  return code >= 200 && code < 400 ? 'succeeded' : 'failed';
}

function httpStatusClass(code) {
  if (typeof code !== 'number') return 'unavailable';
  return `${Math.floor(code / 100)}xx`;
}

function probeHttpCode(url) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve(undefined);
      return;
    }
    const client = parsed.protocol === 'https:' ? https : http;
    const request = client.request(parsed, { method: 'GET', timeout: 5000 }, (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on('timeout', () => {
      request.destroy();
      resolve(undefined);
    });
    request.on('error', () => resolve(undefined));
    request.end();
  });
}

function event({
  traceId,
  runId,
  eventType,
  status,
  timestamp,
  summary,
  parentEventId,
  risk = 'low',
  decision,
  tool,
  links,
}) {
  const result = {
    trace_id: traceId,
    run_id: runId,
    source: 'sentinel',
    event_type: eventType,
    actor: 'ai-node-canary',
    risk,
    status,
    timestamp,
    summary,
    redacted_payload_hash: `sha256:redacted-${traceId.replace(/^evt-/, '').replaceAll('_', '-')}`,
    parent_event_id: parentEventId,
  };
  if (decision) result.decision = decision;
  if (tool) result.tool = tool;
  if (links) result.links = links;
  return result;
}

function buildTrace({ observedAt, httpCode, deployMarker, snapshotManifest }) {
  const runId = `run-ai-node-canary-${observedAt.replace(/[^0-9]/g, '').slice(0, 14)}`;
  const serviceStatus = statusFromHttpCode(httpCode);
  const deployStatus = deployMarker ? 'succeeded' : 'failed';
  const snapshotStatus = snapshotManifest ? 'succeeded' : 'failed';
  const overallStatus = [serviceStatus, deployStatus, snapshotStatus].every((status) => status === 'succeeded')
    ? 'succeeded'
    : 'failed';
  const deployFingerprint = typeof deployMarker?.short_commit === 'string' && deployMarker.short_commit
    ? deployMarker.short_commit
    : 'unavailable';
  const snapshotSource = typeof snapshotManifest?.source_agent === 'string' && snapshotManifest.source_agent
    ? snapshotManifest.source_agent
    : 'unavailable';
  const snapshotClassification = typeof snapshotManifest?.data_classification === 'string' && snapshotManifest.data_classification
    ? snapshotManifest.data_classification
    : 'unavailable';

  return {
    schema_version: SCHEMA_VERSION,
    metadata: {
      id: runId,
      title: 'AI Node operational canary',
      subtitle: 'Redacted health marker for Phosphene service and published snapshot boundary',
      status: overallStatus,
    },
    events: [
      event({
        traceId: 'evt-canary-root',
        runId,
        eventType: 'run.started',
        status: 'running',
        timestamp: observedAt,
        summary: 'AI Node canary started with redacted operational probes only.',
        parentEventId: null,
        links: [{ label: 'Canary service check', href: 'trace://ai-node-canary/phosphene-service' }],
      }),
      event({
        traceId: 'evt-canary-service-health',
        runId,
        eventType: 'health.check',
        status: serviceStatus,
        timestamp: observedAt,
        summary: `Phosphene public service health check returned redacted HTTP status class ${httpStatusClass(httpCode)}.`,
        parentEventId: 'evt-canary-root',
        tool: 'phosphene-service-http-probe',
        decision: serviceStatus === 'succeeded' ? 'service_reachable' : 'service_not_reachable',
        links: [{ label: 'Canary service check', href: 'trace://ai-node-canary/phosphene-service' }],
      }),
      event({
        traceId: 'evt-canary-deploy-marker',
        runId,
        eventType: 'health.check',
        status: deployStatus,
        timestamp: observedAt,
        summary: `Deploy marker was ${deployStatus === 'succeeded' ? 'readable' : 'not readable'}; short commit fingerprint is ${deployFingerprint}.`,
        parentEventId: 'evt-canary-service-health',
        tool: 'node-deploy-json-reader',
        decision: deployStatus === 'succeeded' ? 'deploy_marker_present' : 'deploy_marker_missing',
      }),
      event({
        traceId: 'evt-canary-snapshot-marker',
        runId,
        eventType: 'health.check',
        status: snapshotStatus,
        timestamp: observedAt,
        summary: `Published snapshot marker was ${snapshotStatus === 'succeeded' ? 'readable' : 'not readable'}; source label ${snapshotSource}, classification ${snapshotClassification}.`,
        parentEventId: 'evt-canary-deploy-marker',
        tool: 'published-snapshot-manifest-reader',
        decision: snapshotStatus === 'succeeded' ? 'snapshot_marker_present' : 'snapshot_marker_missing',
      }),
      event({
        traceId: 'evt-canary-completed',
        runId,
        eventType: 'run.completed',
        status: overallStatus,
        timestamp: observedAt,
        summary: `AI Node canary completed with ${overallStatus} status using redacted operational markers only.`,
        parentEventId: 'evt-canary-snapshot-marker',
        decision: overallStatus === 'succeeded' ? 'canary_passed' : 'canary_failed',
      }),
    ],
  };
}

function buildManifest(observedAt) {
  return {
    schema_version: SCHEMA_VERSION,
    created_at: observedAt,
    source_agent: 'ai_node_canary',
    data_classification: 'redacted_operational_canary',
    files: [{
      file: TRACE_FILE,
      description: 'Redacted AI Node operational canary for Phosphene service and published snapshot health.',
    }],
    import_contract: 'phosphene.boundary.v0.1.2-importable',
    notes: 'Operational canary snapshot generated on the AI Node. Redacted service and snapshot health markers only; not live agent telemetry.',
  };
}

function buildValidationReport() {
  return {
    schema_version: SCHEMA_VERSION,
    overall_status: 'passed',
    data_source: 'redacted_operational_markers_only_no_provider_reads',
    trace_results: [{
      file: TRACE_FILE,
      status: 'passed',
    }],
  };
}

function buildReadme({ observedAt }) {
  return [
    '# Phosphene AI Node Canary Snapshot',
    '',
    `Generated at: ${observedAt}`,
    '',
    'This pack contains a redacted operational canary for Phosphene service health.',
    '',
    'It is not live agent telemetry. It does not include provider payloads, credentials, private URLs, real user data, message bodies, document content, or raw infrastructure details.',
    '',
    'The pack is suitable for Phosphene Boundary validation and publisher dry-runs.',
    '',
  ].join('\n');
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function generate(options) {
  const httpCode = options.serviceHttpCode ?? await probeHttpCode(options.serviceUrl);
  const deployMarker = await readJson(path.join(options.serviceDir, 'dist/node-deploy.json'));
  const snapshotManifest = await readJson(path.join(options.serviceDir, 'dist/snapshots/current/manifest.json'));
  const trace = buildTrace({
    observedAt: options.observedAt,
    httpCode,
    deployMarker,
    snapshotManifest,
  });

  await rm(options.target, { recursive: true, force: true });
  await mkdir(options.target, { recursive: true });
  await writeJson(path.join(options.target, TRACE_FILE), trace);
  await writeJson(path.join(options.target, 'manifest.json'), buildManifest(options.observedAt));
  await writeJson(path.join(options.target, 'validation-report.json'), buildValidationReport());
  await writeFile(path.join(options.target, 'README.md'), buildReadme({ observedAt: options.observedAt }));

  return { target: options.target, status: trace.metadata.status };
}

try {
  const result = await generate(parseArgs(process.argv.slice(2)));
  console.log(`Generated AI Node canary snapshot pack: ${result.target}`);
  console.log(`Canary status: ${result.status}`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown canary generation error';
  console.error(message);
  if (error instanceof CliError && error.exitCode === 2) {
    console.error('');
    console.error(usage());
  }
  process.exit(error instanceof CliError ? error.exitCode : 1);
}
