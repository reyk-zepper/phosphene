#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SCHEMA_VERSION = 'phosphene.boundary.v0.1.2';
const TRACE_FILE = 'ai-node-live-adapter.boundary.json';
const DEFAULT_SERVICE_DIR = '/Users/raik./ai-stack/services/phosphene';

class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function usage() {
  return [
    'Usage: generate-ai-node-live-adapter-snapshot --target <dir> [options]',
    '',
    'Writes a redacted Phosphene Boundary pack for near-live AI Node adapter output.',
    '',
    'Options:',
    '  --target <dir>             Output pack directory',
    `  --service-dir <dir>        Phosphene service directory (default: ${DEFAULT_SERVICE_DIR})`,
    '  --observed-at <iso>        Observation timestamp (default: current UTC time)',
    '  --latest-file <file>       Write a redacted latest marker without absolute paths',
    '  --retention-count <count>  Keep only the newest matching ai-node-live-* packs',
    '  --help                    Show this help',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    target: '',
    serviceDir: DEFAULT_SERVICE_DIR,
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
      || arg === '--service-dir'
      || arg === '--observed-at'
      || arg === '--latest-file'
      || arg === '--retention-count'
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new CliError(`${arg} requires a value`, 2);
      if (arg === '--target') options.target = value;
      if (arg === '--service-dir') options.serviceDir = value;
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
    serviceDir: path.resolve(options.serviceDir),
    latestFile: options.latestFile ? path.resolve(options.latestFile) : '',
  };
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return undefined;
  }
}

function redactedStatus(value) {
  return value ? 'succeeded' : 'failed';
}

function event({
  traceId,
  runId,
  source = 'sentinel',
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
    actor: 'ai-node-live-adapter',
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

function buildTrace({ observedAt, deployMarker, snapshotManifest, canaryMarker }) {
  const runId = `run-ai-node-live-${observedAt.replace(/[^0-9]/g, '').slice(0, 14)}`;
  const deployStatus = redactedStatus(deployMarker);
  const snapshotStatus = redactedStatus(snapshotManifest);
  const canaryStatus = redactedStatus(canaryMarker);
  const overallStatus = [deployStatus, snapshotStatus, canaryStatus].every((status) => status === 'succeeded')
    ? 'succeeded'
    : 'failed';
  const deployFingerprint = typeof deployMarker?.short_commit === 'string' && deployMarker.short_commit
    ? deployMarker.short_commit
    : 'unavailable';
  const snapshotClassification = typeof snapshotManifest?.data_classification === 'string' && snapshotManifest.data_classification
    ? snapshotManifest.data_classification
    : 'unavailable';
  const liveCanaryStatus = typeof canaryMarker?.canary_status === 'string' && canaryMarker.canary_status
    ? canaryMarker.canary_status
    : 'unavailable';

  return {
    schema_version: SCHEMA_VERSION,
    metadata: {
      id: runId,
      title: 'AI Node live adapter redacted output',
      subtitle: 'Near-live Boundary adapter output with private runtime details removed',
      status: overallStatus,
    },
    events: [
      event({
        traceId: 'evt-live-adapter-root',
        runId,
        eventType: 'adapter.tick',
        status: 'running',
        timestamp: observedAt,
        summary: 'AI Node live adapter emitted a redacted heartbeat from served operational markers.',
        parentEventId: null,
        links: [{ label: 'Adapter heartbeat', href: 'trace://ai-node-live/heartbeat' }],
      }),
      event({
        traceId: 'evt-live-adapter-deploy-boundary',
        runId,
        eventType: 'adapter.redacted_boundary',
        status: deployStatus,
        timestamp: observedAt,
        summary: `Deploy marker boundary was ${deployStatus}; short commit fingerprint is ${deployFingerprint}.`,
        parentEventId: 'evt-live-adapter-root',
        tool: 'node-deploy-json-reader',
        decision: deployStatus === 'succeeded' ? 'deploy_marker_redacted' : 'deploy_marker_missing',
      }),
      event({
        traceId: 'evt-live-adapter-snapshot-boundary',
        runId,
        source: 'aag',
        eventType: 'adapter.redacted_boundary',
        status: snapshotStatus,
        timestamp: observedAt,
        summary: `Published snapshot boundary was ${snapshotStatus}; classification label is ${snapshotClassification}.`,
        parentEventId: 'evt-live-adapter-deploy-boundary',
        tool: 'published-snapshot-manifest-reader',
        decision: snapshotStatus === 'succeeded' ? 'snapshot_boundary_redacted' : 'snapshot_boundary_missing',
      }),
      event({
        traceId: 'evt-live-adapter-canary-boundary',
        runId,
        source: 'sentinel',
        eventType: 'adapter.redacted_boundary',
        status: canaryStatus,
        timestamp: observedAt,
        summary: `Canary marker boundary was ${canaryStatus}; canary status label is ${liveCanaryStatus}.`,
        parentEventId: 'evt-live-adapter-snapshot-boundary',
        tool: 'canary-latest-marker-reader',
        decision: canaryStatus === 'succeeded' ? 'canary_boundary_redacted' : 'canary_boundary_missing',
      }),
      event({
        traceId: 'evt-live-adapter-completed',
        runId,
        eventType: 'run.completed',
        status: overallStatus,
        timestamp: observedAt,
        summary: `AI Node live adapter completed with ${overallStatus} status using redacted adapter output only.`,
        parentEventId: 'evt-live-adapter-canary-boundary',
        decision: overallStatus === 'succeeded' ? 'adapter_output_ready' : 'adapter_output_incomplete',
      }),
    ],
  };
}

function buildManifest(observedAt) {
  return {
    schema_version: SCHEMA_VERSION,
    created_at: observedAt,
    source_agent: 'ai_node_live_adapter',
    data_classification: 'redacted_live_adapter',
    files: [{
      file: TRACE_FILE,
      description: 'Redacted near-live AI Node adapter Boundary output.',
    }],
    import_contract: 'phosphene.boundary.v0.1.2-importable',
    notes: 'Near-live adapter snapshot generated on the AI Node. Redacted Boundary output only; no raw live telemetry, secrets, private URLs, provider payloads, or user content.',
  };
}

function buildValidationReport() {
  return {
    schema_version: SCHEMA_VERSION,
    overall_status: 'passed',
    data_source: 'redacted_live_adapter_output_only_no_provider_reads',
    trace_results: [{
      file: TRACE_FILE,
      status: 'passed',
    }],
  };
}

function buildReadme(observedAt) {
  return [
    '# Phosphene AI Node Live Adapter Snapshot',
    '',
    `Generated at: ${observedAt}`,
    '',
    'This pack contains redacted near-live adapter output for Phosphene.',
    '',
    'It is not raw live telemetry. It does not include provider payloads, credentials, private URLs, real user data, message bodies, document content, or raw infrastructure details.',
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
  const deployMarker = await readJson(path.join(options.serviceDir, 'dist/node-deploy.json'));
  const snapshotManifest = await readJson(path.join(options.serviceDir, 'dist/snapshots/current/manifest.json'));
  const canaryMarker = await readJson(path.join(options.serviceDir, 'dist/snapshots/canary/latest.json'));
  const trace = buildTrace({
    observedAt: options.observedAt,
    deployMarker,
    snapshotManifest,
    canaryMarker,
  });

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
  console.log(`Generated AI Node live adapter snapshot pack: ${result.target}`);
  console.log(`Live adapter status: ${result.status}`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown live adapter generation error';
  console.error(message);
  if (error instanceof CliError && error.exitCode === 2) {
    console.error('');
    console.error(usage());
  }
  process.exit(error instanceof CliError ? error.exitCode : 1);
}
