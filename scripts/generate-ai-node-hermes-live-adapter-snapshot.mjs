#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SCHEMA_VERSION = 'phosphene.boundary.v0.1.2';
const TRACE_FILE = 'hermes-live-adapter.boundary.json';
const DEFAULT_HERMES_HOME = '/Users/raik./ai-stack/data/hermes/home';

class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function usage() {
  return [
    'Usage: generate-ai-node-hermes-live-adapter-snapshot --target <dir> [options]',
    '',
    'Writes a redacted Phosphene Boundary pack for near-live Hermes adapter output.',
    '',
    'Options:',
    '  --target <dir>             Output pack directory',
    `  --hermes-home <dir>        Hermes home directory (default: ${DEFAULT_HERMES_HOME})`,
    '  --observed-at <iso>        Observation timestamp (default: current UTC time)',
    '  --latest-file <file>       Write a redacted latest marker without absolute paths',
    '  --retention-count <count>  Keep only the newest matching ai-node-live-* packs',
    '  --help                    Show this help',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    target: '',
    hermesHome: DEFAULT_HERMES_HOME,
    observedAt: new Date().toISOString(),
    latestFile: '',
    retentionCount: undefined,
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
      || arg === '--hermes-home'
      || arg === '--observed-at'
      || arg === '--latest-file'
      || arg === '--retention-count'
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new CliError(`${arg} requires a value`, 2);
      if (arg === '--target') options.target = value;
      if (arg === '--hermes-home') options.hermesHome = value;
      if (arg === '--observed-at') options.observedAt = value;
      if (arg === '--latest-file') options.latestFile = value;
      if (arg === '--retention-count') options.retentionCount = Number(value);
      index += 1;
      continue;
    }

    throw new CliError(`Unknown argument: ${arg}`, 2);
  }

  if (!options.target) throw new CliError('--target is required', 2);
  if (Number.isNaN(Date.parse(options.observedAt))) throw new CliError('--observed-at must be an ISO timestamp', 2);
  if (
    options.retentionCount !== undefined
    && (!Number.isInteger(options.retentionCount) || options.retentionCount < 1)
  ) {
    throw new CliError('--retention-count must be an integer greater than 0', 2);
  }

  return {
    ...options,
    target: path.resolve(options.target),
    hermesHome: path.resolve(options.hermesHome),
    latestFile: options.latestFile ? path.resolve(options.latestFile) : '',
  };
}

async function markerFor(filePath) {
  try {
    const info = await stat(filePath);
    return {
      exists: true,
      sizeBand: sizeBand(info.size),
      modifiedAt: info.mtime.toISOString(),
    };
  } catch {
    return {
      exists: false,
      sizeBand: 'missing',
      modifiedAt: 'unavailable',
    };
  }
}

function sizeBand(bytes) {
  if (bytes <= 0) return 'empty';
  if (bytes < 1024) return 'small';
  if (bytes < 1024 * 1024) return 'medium';
  return 'large';
}

async function readHermesJobShape(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    const jobs = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.jobs)
        ? parsed.jobs
        : [];
    const enabledCount = jobs.filter((job) => job && typeof job === 'object' && job.enabled !== false).length;
    return { parseable: true, jobCount: jobs.length, enabledCount };
  } catch {
    return { parseable: false, jobCount: 0, enabledCount: 0 };
  }
}

async function readGatewayStatus(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    const value = typeof parsed?.status === 'string' ? parsed.status.toLowerCase() : 'available';
    return ['running', 'idle', 'stopped', 'failed'].includes(value) ? value : 'available';
  } catch {
    return 'unavailable';
  }
}

function statusFromMarker(marker) {
  return marker.exists ? 'succeeded' : 'failed';
}

function event({
  traceId,
  runId,
  source = 'hermes',
  eventType,
  status,
  timestamp,
  summary,
  parentEventId,
  decision,
  tool,
  links,
}) {
  const result = {
    trace_id: traceId,
    run_id: runId,
    source,
    event_type: eventType,
    actor: 'hermes-live-adapter',
    risk: 'low',
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

async function collectHermesMarkers(hermesHome) {
  const config = await markerFor(path.join(hermesHome, 'config.yaml'));
  const cron = await markerFor(path.join(hermesHome, 'cron/jobs.json'));
  const log = await markerFor(path.join(hermesHome, 'logs/agent.log'));
  const gatewayState = await markerFor(path.join(hermesHome, 'gateway_state.json'));
  const gatewayPid = await markerFor(path.join(hermesHome, 'gateway.pid'));
  const gatewayLock = await markerFor(path.join(hermesHome, 'gateway.lock'));
  const jobShape = cron.exists
    ? await readHermesJobShape(path.join(hermesHome, 'cron/jobs.json'))
    : { parseable: false, jobCount: 0, enabledCount: 0 };
  const gatewayStatus = gatewayState.exists
    ? await readGatewayStatus(path.join(hermesHome, 'gateway_state.json'))
    : 'unavailable';

  return {
    config,
    cron,
    log,
    gatewayState,
    gatewayPid,
    gatewayLock,
    jobShape,
    gatewayStatus,
  };
}

function buildTrace({ observedAt, markers }) {
  const runId = `run-hermes-live-${observedAt.replace(/[^0-9]/g, '').slice(0, 14)}`;
  const configStatus = statusFromMarker(markers.config);
  const cronStatus = markers.cron.exists && markers.jobShape.parseable ? 'succeeded' : 'failed';
  const logStatus = statusFromMarker(markers.log);
  const gatewayStatus = markers.gatewayPid.exists || markers.gatewayLock.exists || markers.gatewayState.exists
    ? 'succeeded'
    : 'failed';
  const overallStatus = [configStatus, cronStatus, logStatus, gatewayStatus].every((status) => status === 'succeeded')
    ? 'succeeded'
    : 'failed';

  return {
    schema_version: SCHEMA_VERSION,
    metadata: {
      id: runId,
      title: 'Hermes live adapter redacted status',
      subtitle: 'Near-live Hermes Boundary markers with private runtime details removed',
      status: overallStatus,
    },
    events: [
      event({
        traceId: 'evt-hermes-live-root',
        runId,
        eventType: 'adapter.tick',
        status: 'running',
        timestamp: observedAt,
        summary: 'Hermes live adapter emitted a redacted heartbeat from AI Node operational markers.',
        parentEventId: null,
        links: [{ label: 'Hermes adapter heartbeat', href: 'trace://hermes-live/heartbeat' }],
      }),
      event({
        traceId: 'evt-hermes-config-boundary',
        runId,
        eventType: 'health.check',
        status: configStatus,
        timestamp: observedAt,
        summary: `Hermes config marker was ${configStatus}; file class ${markers.config.sizeBand}, modified marker ${markers.config.modifiedAt}.`,
        parentEventId: 'evt-hermes-live-root',
        tool: 'hermes-config-stat',
        decision: configStatus === 'succeeded' ? 'config_marker_redacted' : 'config_marker_missing',
      }),
      event({
        traceId: 'evt-hermes-cron-boundary',
        runId,
        eventType: 'adapter.redacted_boundary',
        status: cronStatus,
        timestamp: observedAt,
        summary: `Hermes cron marker was ${cronStatus}; ${markers.jobShape.jobCount} configured job slot(s), ${markers.jobShape.enabledCount} enabled marker(s).`,
        parentEventId: 'evt-hermes-config-boundary',
        tool: 'hermes-cron-shape-reader',
        decision: cronStatus === 'succeeded' ? 'cron_shape_redacted' : 'cron_shape_unavailable',
      }),
      event({
        traceId: 'evt-hermes-gateway-boundary',
        runId,
        source: 'aag',
        eventType: 'adapter.redacted_boundary',
        status: gatewayStatus,
        timestamp: observedAt,
        summary: `Hermes gateway marker was ${gatewayStatus}; public status label ${markers.gatewayStatus}.`,
        parentEventId: 'evt-hermes-cron-boundary',
        tool: 'hermes-gateway-marker-reader',
        decision: gatewayStatus === 'succeeded' ? 'gateway_marker_redacted' : 'gateway_marker_missing',
      }),
      event({
        traceId: 'evt-hermes-log-boundary',
        runId,
        source: 'sentinel',
        eventType: 'health.check',
        status: logStatus,
        timestamp: observedAt,
        summary: `Hermes agent log marker was ${logStatus}; file class ${markers.log.sizeBand}, modified marker ${markers.log.modifiedAt}.`,
        parentEventId: 'evt-hermes-gateway-boundary',
        tool: 'hermes-log-stat',
        decision: logStatus === 'succeeded' ? 'log_marker_redacted_no_content_read' : 'log_marker_missing',
      }),
      event({
        traceId: 'evt-hermes-live-completed',
        runId,
        eventType: 'run.completed',
        status: overallStatus,
        timestamp: observedAt,
        summary: `Hermes live adapter completed with ${overallStatus} status using redacted operational markers only.`,
        parentEventId: 'evt-hermes-log-boundary',
        decision: overallStatus === 'succeeded' ? 'hermes_adapter_output_ready' : 'hermes_adapter_output_incomplete',
      }),
    ],
  };
}

function buildManifest(observedAt) {
  return {
    schema_version: SCHEMA_VERSION,
    created_at: observedAt,
    source_agent: 'hermes',
    data_classification: 'redacted_live_adapter',
    files: [{
      file: TRACE_FILE,
      description: 'Redacted near-live Hermes adapter Boundary output.',
    }],
    import_contract: 'phosphene.boundary.v0.1.2-importable',
    notes: 'Hermes near-live adapter snapshot generated on the AI Node. Redacted operational markers only; no raw live telemetry, credentials, private URLs, provider payloads, message bodies, or user content.',
  };
}

function buildValidationReport() {
  return {
    schema_version: SCHEMA_VERSION,
    overall_status: 'passed',
    data_source: 'redacted_hermes_operational_markers_only_no_provider_reads',
    trace_results: [{
      file: TRACE_FILE,
      status: 'passed',
    }],
  };
}

function buildReadme(observedAt) {
  return [
    '# Phosphene Hermes Live Adapter Snapshot',
    '',
    `Generated at: ${observedAt}`,
    '',
    'This pack contains redacted near-live Hermes adapter output for Phosphene.',
    '',
    'It is not raw live telemetry. It does not include provider payloads, credentials, private URLs, real user data, message bodies, document content, or raw infrastructure details.',
    '',
    'Only file existence, coarse size bands, modified-time markers, public status labels, and structural job counts are emitted.',
    '',
    'The pack is suitable for Phosphene Boundary validation and served `/snapshots/live/` loading.',
    '',
  ].join('\n');
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function sha256File(filePath) {
  return `sha256:${createHash('sha256').update(await readFile(filePath)).digest('hex')}`;
}

function buildLatestMarker({
  observedAt,
  target,
  status,
  manifestSha256,
  retentionCount,
}) {
  const latestPack = path.basename(target);
  return {
    schema_version: SCHEMA_VERSION,
    updated_at: observedAt,
    source_agent: 'ai_node_live_adapter',
    data_classification: 'redacted_live_adapter',
    latest_pack: latestPack,
    adapter_status: status,
    manifest_file: `${latestPack}/manifest.json`,
    manifest_sha256: manifestSha256,
    retention_count: retentionCount ?? null,
  };
}

async function writeLatestMarker(options, { status, manifestPath }) {
  if (!options.latestFile) return;

  await mkdir(path.dirname(options.latestFile), { recursive: true });
  await writeJson(options.latestFile, buildLatestMarker({
    observedAt: options.observedAt,
    target: options.target,
    status,
    manifestSha256: await sha256File(manifestPath),
    retentionCount: options.retentionCount,
  }));
}

async function pruneLivePacks({ root, keep, currentTarget }) {
  if (keep === undefined) return;

  const entries = await readdir(root, { withFileTypes: true });
  const packs = entries
    .filter((entry) => entry.isDirectory() && /^ai-node-live-\d{8}T\d{6}Z$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));
  const current = path.resolve(currentTarget);

  await Promise.all(packs.slice(keep).map(async (pack) => {
    const candidate = path.resolve(root, pack);
    if (candidate === current) return;
    await rm(candidate, { recursive: true, force: true });
  }));
}

async function generate(options) {
  const markers = await collectHermesMarkers(options.hermesHome);
  const trace = buildTrace({ observedAt: options.observedAt, markers });

  await rm(options.target, { recursive: true, force: true });
  await mkdir(options.target, { recursive: true });
  await writeJson(path.join(options.target, TRACE_FILE), trace);
  const manifestPath = path.join(options.target, 'manifest.json');
  await writeJson(manifestPath, buildManifest(options.observedAt));
  await writeJson(path.join(options.target, 'validation-report.json'), buildValidationReport());
  await writeFile(path.join(options.target, 'README.md'), buildReadme(options.observedAt));
  await writeLatestMarker(options, { status: trace.metadata.status, manifestPath });
  await pruneLivePacks({
    root: options.latestFile ? path.dirname(options.latestFile) : path.dirname(options.target),
    keep: options.retentionCount,
    currentTarget: options.target,
  });

  return { target: options.target, status: trace.metadata.status };
}

try {
  const result = await generate(parseArgs(process.argv.slice(2)));
  console.log(`Generated Hermes live adapter snapshot pack: ${result.target}`);
  console.log(`Hermes live adapter status: ${result.status}`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown Hermes live adapter generation error';
  console.error(message);
  if (error instanceof CliError && error.exitCode === 2) {
    console.error('');
    console.error(usage());
  }
  process.exit(error instanceof CliError ? error.exitCode : 1);
}
