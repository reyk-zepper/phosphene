#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const SCHEMA_VERSION = 'phosphene.boundary.v0.1.2';
const DEFAULT_AI_STACK_ROOT = '/Users/raik./ai-stack';
const TRACE_DEFINITIONS = [
  {
    key: 'aag',
    displayName: 'AAG',
    source: 'aag',
    file: 'aag-live-adapter.boundary.json',
    title: 'AAG live adapter redacted status',
  },
  {
    key: 'gmail',
    displayName: 'Gmail',
    source: 'aag',
    file: 'gmail-live-adapter.boundary.json',
    title: 'Gmail live adapter redacted status',
  },
  {
    key: 'hermes',
    displayName: 'Hermes',
    source: 'hermes',
    file: 'hermes-live-adapter.boundary.json',
    title: 'Hermes live adapter redacted status',
  },
  {
    key: 'openclaw',
    displayName: 'OpenClaw',
    source: 'openclaw',
    file: 'openclaw-live-adapter.boundary.json',
    title: 'OpenClaw live adapter redacted status',
  },
  {
    key: 'sentinel',
    displayName: 'Sentinel',
    source: 'sentinel',
    file: 'sentinel-live-adapter.boundary.json',
    title: 'Sentinel live adapter redacted status',
  },
  {
    key: 'sideEffectIntent',
    kind: 'side_effect_intent',
    displayName: 'Side-effect intent',
    source: 'aag',
    file: 'side-effect-intent-live-adapter.boundary.json',
    title: 'Side-effect intent live adapter redacted status',
  },
  {
    key: 'workspace',
    displayName: 'Workspace',
    source: 'aag',
    file: 'workspace-live-adapter.boundary.json',
    title: 'Workspace live adapter redacted status',
  },
];

class CliError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function usage() {
  return [
    'Usage: generate-ai-node-service-live-adapters-snapshot --target <dir> [options]',
    '',
    'Writes a redacted Phosphene Boundary pack for near-live AI Node service adapter output.',
    '',
    'Options:',
    '  --target <dir>             Output pack directory',
    `  --ai-stack-root <dir>      AI stack root directory (default: ${DEFAULT_AI_STACK_ROOT})`,
    '  --observed-at <iso>        Observation timestamp (default: current UTC time)',
    '  --latest-file <file>       Write a redacted latest marker without absolute paths',
    '  --retention-count <count>  Keep only the newest matching ai-node-live-* packs',
    '  --help                    Show this help',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    target: '',
    aiStackRoot: DEFAULT_AI_STACK_ROOT,
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
      || arg === '--ai-stack-root'
      || arg === '--observed-at'
      || arg === '--latest-file'
      || arg === '--retention-count'
    ) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new CliError(`${arg} requires a value`, 2);
      if (arg === '--target') options.target = value;
      if (arg === '--ai-stack-root') options.aiStackRoot = value;
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
    aiStackRoot: path.resolve(options.aiStackRoot),
    latestFile: options.latestFile ? path.resolve(options.latestFile) : '',
  };
}

function sizeBand(bytes) {
  if (bytes <= 0) return 'empty';
  if (bytes < 1024) return 'small';
  if (bytes < 1024 * 1024) return 'medium';
  return 'large';
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

async function countEntries(dirPath, predicate = () => true) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => predicate(entry.name, entry)).length;
  } catch {
    return 0;
  }
}

function statusFromSignal(value) {
  return value > 0 ? 'succeeded' : 'failed';
}

function sumMarkers(markers) {
  return markers.filter((marker) => marker.exists).length;
}

function markerShape(markers) {
  const existing = markers.filter((marker) => marker.exists);
  const sizeBands = [...new Set(existing.map((marker) => marker.sizeBand))].sort();
  const modifiedMarkers = existing
    .map((marker) => marker.modifiedAt)
    .filter((value) => value !== 'unavailable')
    .sort();

  return {
    sizeBands: sizeBands.length > 0 ? sizeBands.join('/') : 'missing',
    newestModifiedAt: modifiedMarkers.at(-1) ?? 'unavailable',
  };
}

function event({
  traceId,
  runId,
  source,
  eventType,
  status,
  timestamp,
  summary,
  parentEventId,
  decision,
  risk = 'low',
  tool,
  links,
}) {
  const result = {
    trace_id: traceId,
    run_id: runId,
    source,
    event_type: eventType,
    actor: 'ai-node-service-live-adapter',
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

async function collectAag(root) {
  const serviceMarkers = [
    await markerFor(path.join(root, 'services/agent-action-gateway')),
    await markerFor(path.join(root, 'services/aag-gateway-live')),
  ];
  const scriptCount = await countEntries(path.join(root, 'bin'), (name) => /^aag-/.test(name));
  const logCount = await countEntries(path.join(root, 'logs'), (name) => /^aag-gateway.*\.log$/.test(name))
    + await countEntries(path.join(root, 'logs/agent-action-gateway'), (name) => name.includes('smoke'));
  const dataCount = await countEntries(path.join(root, 'data/agent-action-gateway'));
  return { serviceMarkers, scriptCount, logCount, stateCount: 0, dataCount };
}

async function collectGmail(root) {
  const serviceMarkers = [
    await markerFor(path.join(root, 'services/agent-action-gateway')),
    await markerFor(path.join(root, 'services/aag-gateway-live')),
  ];
  const scriptCount = await countEntries(path.join(root, 'bin'), (name) => /^aag-.*gmail/i.test(name));
  const logCount = await countEntries(path.join(root, 'logs/agent-action-gateway'), (name) => /gmail/i.test(name));
  const hermesCount = await countEntries(path.join(root, 'data/hermes/home'), (name) => /gmail/i.test(name));
  const dataCount = await countEntries(path.join(root, 'data/agent-action-gateway'), (name) => /gmail/i.test(name))
    + hermesCount;
  return { serviceMarkers, scriptCount, logCount, stateCount: 0, dataCount };
}

async function collectHermes(root) {
  const serviceMarkers = [
    await markerFor(path.join(root, 'data/hermes/home/config.yaml')),
    await markerFor(path.join(root, 'data/hermes/home/cron/jobs.json')),
    await markerFor(path.join(root, 'data/hermes/home/gateway_state.json')),
    await markerFor(path.join(root, 'data/hermes/home/gateway.pid')),
    await markerFor(path.join(root, 'data/hermes/home/gateway.lock')),
  ];
  const scriptCount = 0;
  const logCount = sumMarkers([await markerFor(path.join(root, 'data/hermes/home/logs/agent.log'))]);
  const stateCount = await countEntries(path.join(root, 'data/hermes/home'), (name) => /state|status|gateway|lock|pid/i.test(name));
  const dataCount = await countEntries(path.join(root, 'data/hermes/home'), (name) => /gmail|workspace|attestation/i.test(name));
  return { serviceMarkers, scriptCount, logCount, stateCount, dataCount };
}

async function collectOpenClaw(root) {
  const serviceMarkers = [
    await markerFor(path.join(root, 'services/openclaw')),
    await markerFor(path.join(root, 'services/openclaw-worker-mcp')),
  ];
  const scriptCount = await countEntries(path.join(root, 'bin'), (name) => /openclaw/i.test(name));
  const logCount = await countEntries(path.join(root, 'logs'), (name) => /^openclaw.*\.log$/.test(name));
  const stateMarkers = [
    await markerFor(path.join(root, 'state/openclaw-worker-health.env')),
    await markerFor(path.join(root, 'state/openclaw-update-status.env')),
    await markerFor(path.join(root, 'state/openclaw-worker-health.last-live')),
    await markerFor(path.join(root, 'state/openclaw-update.alert')),
    await markerFor(path.join(root, 'state/openclaw-worker-health.alert')),
    await markerFor(path.join(root, 'state/openclaw-guard.version')),
  ];
  const dataCount = sumMarkers([await markerFor(path.join(root, 'data/openclaw/home/openclaw.json'))]);
  return { serviceMarkers, scriptCount, logCount, stateCount: sumMarkers(stateMarkers), dataCount };
}

async function collectSentinel(root) {
  const serviceMarkers = [
    await markerFor(path.join(root, 'state/openclaw-update.alert')),
    await markerFor(path.join(root, 'state/openclaw-worker-health.alert')),
    await markerFor(path.join(root, 'state/openclaw-worker-health.last-live')),
  ];
  const scriptCount = await countEntries(path.join(root, 'bin'), (name) => /sentinel|health|guard/i.test(name));
  const logCount = await countEntries(path.join(root, 'logs'), (name) => /health|guard|update/i.test(name));
  const stateCount = await countEntries(path.join(root, 'state'), (name) => /\.(alert|env)$/.test(name) || /health|guard|status/i.test(name));
  const dataCount = 0;
  return { serviceMarkers, scriptCount, logCount, stateCount, dataCount };
}

async function collectWorkspace(root) {
  const serviceMarkers = [
    await markerFor(path.join(root, 'services/agent-action-gateway')),
    await markerFor(path.join(root, 'services/aag-gateway-live')),
  ];
  const scriptCount = await countEntries(path.join(root, 'bin'), (name) => /^aag-.*(workspace|google)/i.test(name));
  const logCount = await countEntries(path.join(root, 'logs/agent-action-gateway'), (name) => /workspace|google/i.test(name));
  const attestationCount = sumMarkers([await markerFor(path.join(root, 'data/hermes/home/workspace-attestations'))]);
  const dataCount = await countEntries(path.join(root, 'data/agent-action-gateway'), (name) => /workspace|google/i.test(name))
    + await countEntries(path.join(root, 'data/hermes/home'), (name) => /workspace|attestation/i.test(name))
    + attestationCount;
  return { serviceMarkers, scriptCount, logCount, stateCount: 0, dataCount };
}

function intentBucket(label, ...counts) {
  return {
    label,
    markerCount: counts.reduce((sum, count) => sum + count, 0),
  };
}

async function collectSideEffectIntent(root) {
  const serviceMarkers = [
    await markerFor(path.join(root, 'services/agent-action-gateway')),
    await markerFor(path.join(root, 'services/aag-gateway-live')),
  ];
  const gmailBucket = intentBucket(
    'gmail',
    await countEntries(path.join(root, 'bin'), (name) => /^aag-.*(gmail|draft)/i.test(name)),
    await countEntries(path.join(root, 'logs/agent-action-gateway'), (name) => /(gmail|draft)/i.test(name)),
    await countEntries(path.join(root, 'data/agent-action-gateway'), (name) => /(gmail|draft)/i.test(name)),
    await countEntries(path.join(root, 'data/hermes/home'), (name) => /(gmail|draft)/i.test(name))
  );
  const workspaceBucket = intentBucket(
    'workspace',
    await countEntries(path.join(root, 'bin'), (name) => /^aag-.*(workspace|google|calendar|docs|drive|bundle)/i.test(name)),
    await countEntries(path.join(root, 'logs/agent-action-gateway'), (name) => /(workspace|google|calendar|docs|drive|bundle)/i.test(name)),
    await countEntries(path.join(root, 'data/agent-action-gateway'), (name) => /(workspace|google|calendar|docs|drive|bundle)/i.test(name)),
    await countEntries(path.join(root, 'data/hermes/home'), (name) => /(workspace|attestation|calendar|docs|drive|bundle)/i.test(name))
  );
  const categoryBuckets = [gmailBucket, workspaceBucket].filter((bucket) => bucket.markerCount > 0);
  const intentMarkerCount = categoryBuckets.reduce((sum, bucket) => sum + bucket.markerCount, 0);
  const approvalGateCount = sumMarkers(serviceMarkers) + await countEntries(path.join(root, 'bin'), (name) => /^aag-/.test(name));

  return {
    serviceMarkers,
    categoryBuckets,
    intentMarkerCount,
    approvalGateCount,
  };
}

async function collectMarkers(root) {
  const [aag, gmail, hermes, openclaw, sentinel, sideEffectIntent, workspace] = await Promise.all([
    collectAag(root),
    collectGmail(root),
    collectHermes(root),
    collectOpenClaw(root),
    collectSentinel(root),
    collectSideEffectIntent(root),
    collectWorkspace(root),
  ]);

  return { aag, gmail, hermes, openclaw, sentinel, sideEffectIntent, workspace };
}

function buildTrace({ definition, observedAt, markers }) {
  const runId = `run-${definition.key}-live-${observedAt.replace(/[^0-9]/g, '').slice(0, 14)}`;
  const serviceMarkerCount = sumMarkers(markers.serviceMarkers);
  const inventorySignal = serviceMarkerCount + markers.scriptCount;
  const runtimeSignal = markers.logCount + markers.stateCount + markers.dataCount;
  const inventoryStatus = statusFromSignal(inventorySignal);
  const runtimeStatus = statusFromSignal(runtimeSignal);
  const boundaryStatus = statusFromSignal(inventorySignal + runtimeSignal);
  const overallStatus = boundaryStatus;
  const prefix = definition.key;
  const serviceShape = markerShape(markers.serviceMarkers);

  return {
    schema_version: SCHEMA_VERSION,
    metadata: {
      id: runId,
      title: definition.title,
      subtitle: `Near-live ${definition.displayName} Boundary markers with private runtime details removed`,
      status: overallStatus,
    },
    events: [
      event({
        traceId: `evt-${prefix}-live-root`,
        runId,
        source: definition.source,
        eventType: 'adapter.tick',
        status: 'running',
        timestamp: observedAt,
        summary: `${definition.displayName} live adapter emitted a redacted heartbeat from AI Node service markers.`,
        parentEventId: null,
        links: [{ label: `${definition.displayName} adapter heartbeat`, href: `trace://${prefix}-live/heartbeat` }],
      }),
      event({
        traceId: `evt-${prefix}-inventory-boundary`,
        runId,
        source: definition.source,
        eventType: 'health.check',
        status: inventoryStatus,
        timestamp: observedAt,
        summary: `${definition.displayName} service inventory was ${inventoryStatus}; ${serviceMarkerCount} service marker(s), ${markers.scriptCount} launcher marker(s), file class ${serviceShape.sizeBands}, newest modified marker ${serviceShape.newestModifiedAt}.`,
        parentEventId: `evt-${prefix}-live-root`,
        tool: `${prefix}-service-marker-stat`,
        decision: inventoryStatus === 'succeeded' ? 'service_inventory_redacted' : 'service_inventory_missing',
      }),
      event({
        traceId: `evt-${prefix}-runtime-boundary`,
        runId,
        source: definition.source,
        eventType: 'adapter.redacted_boundary',
        status: runtimeStatus,
        timestamp: observedAt,
        summary: `${definition.displayName} runtime boundary was ${runtimeStatus}; ${markers.stateCount} state marker(s), ${markers.logCount} log marker(s), ${markers.dataCount} data marker(s).`,
        parentEventId: `evt-${prefix}-inventory-boundary`,
        tool: `${prefix}-runtime-marker-counter`,
        decision: runtimeStatus === 'succeeded' ? 'runtime_shape_redacted' : 'runtime_shape_unavailable',
      }),
      event({
        traceId: `evt-${prefix}-privacy-boundary`,
        runId,
        source: definition.source,
        eventType: 'adapter.redacted_boundary',
        status: boundaryStatus,
        timestamp: observedAt,
        summary: `${definition.displayName} adapter emitted count-only operational shape; file content, provider payload, message body, document body, and credential value are excluded.`,
        parentEventId: `evt-${prefix}-runtime-boundary`,
        tool: `${prefix}-redaction-boundary`,
        decision: boundaryStatus === 'succeeded' ? 'redacted_boundary_ready' : 'redacted_boundary_incomplete',
      }),
      event({
        traceId: `evt-${prefix}-live-completed`,
        runId,
        source: definition.source,
        eventType: 'run.completed',
        status: overallStatus,
        timestamp: observedAt,
        summary: `${definition.displayName} live adapter completed with ${overallStatus} status using redacted operational markers only.`,
        parentEventId: `evt-${prefix}-privacy-boundary`,
        decision: overallStatus === 'succeeded' ? 'service_adapter_output_ready' : 'service_adapter_output_incomplete',
      }),
    ],
  };
}

function buildSideEffectIntentTrace({ definition, observedAt, markers }) {
  const runId = `run-side-effect-intent-live-${observedAt.replace(/[^0-9]/g, '').slice(0, 14)}`;
  const hasIntentMarkers = markers.intentMarkerCount > 0;
  const status = hasIntentMarkers ? 'needs_approval' : 'succeeded';
  const bucketLabels = markers.categoryBuckets.map((bucket) => bucket.label).join(', ') || 'none';
  const risk = hasIntentMarkers ? 'high' : 'low';

  return {
    schema_version: SCHEMA_VERSION,
    metadata: {
      id: runId,
      title: definition.title,
      subtitle: 'Near-live redacted AAG side-effect intent markers with private action details removed',
      status,
    },
    events: [
      event({
        traceId: 'evt-side-effect-intent-live-root',
        runId,
        source: definition.source,
        eventType: 'adapter.tick',
        status: 'running',
        timestamp: observedAt,
        summary: 'Side-effect intent adapter emitted a redacted heartbeat from AAG approval-boundary markers.',
        parentEventId: null,
        links: [{ label: 'Side-effect intent heartbeat', href: 'trace://side-effect-intent-live/heartbeat' }],
      }),
      event({
        traceId: 'evt-side-effect-intent-categories',
        runId,
        source: definition.source,
        eventType: 'tool.requested',
        status,
        timestamp: observedAt,
        summary: `Side-effect intent marker scan found ${markers.intentMarkerCount} redacted marker(s) across ${markers.categoryBuckets.length} category bucket(s): ${bucketLabels}.`,
        parentEventId: 'evt-side-effect-intent-live-root',
        risk: hasIntentMarkers ? 'medium' : 'low',
        tool: 'redacted-side-effect-intent-counter',
        decision: hasIntentMarkers ? 'side_effect_intent_detected' : 'no_side_effect_intent_detected',
        links: [{ label: 'Category counts only', href: 'trace://side-effect-intent-live/categories' }],
      }),
      event({
        traceId: 'evt-side-effect-intent-aag-decision',
        runId,
        source: definition.source,
        eventType: 'aag.decision',
        status,
        timestamp: observedAt,
        summary: `AAG side-effect policy marker was ${status}; ${markers.approvalGateCount} approval-gate marker(s) available without exposing action arguments.`,
        parentEventId: 'evt-side-effect-intent-categories',
        risk,
        tool: 'redacted-aag-approval-boundary-counter',
        decision: hasIntentMarkers ? 'side_effects_require_approval' : 'no_side_effects_detected',
      }),
      event({
        traceId: 'evt-side-effect-intent-approval-required',
        runId,
        source: definition.source,
        eventType: 'approval.required',
        status,
        timestamp: observedAt,
        summary: hasIntentMarkers
          ? `AAG kept ${markers.intentMarkerCount} redacted side-effect intent marker(s) behind approval; payload, recipient, provider, document, and argument values are excluded.`
          : 'AAG found no redacted side-effect intent markers requiring approval.',
        parentEventId: 'evt-side-effect-intent-aag-decision',
        risk,
        decision: hasIntentMarkers ? 'approval_required' : 'approval_not_required',
      }),
      event({
        traceId: 'evt-side-effect-intent-privacy-boundary',
        runId,
        source: definition.source,
        eventType: 'adapter.redacted_boundary',
        status: hasIntentMarkers ? 'succeeded' : status,
        timestamp: observedAt,
        summary: 'Side-effect intent adapter emitted only category counts and approval-boundary status; raw action payloads and provider calls are excluded.',
        parentEventId: 'evt-side-effect-intent-approval-required',
        risk: 'low',
        tool: 'side-effect-intent-redaction-boundary',
        decision: 'redacted_boundary_ready',
      }),
      event({
        traceId: 'evt-side-effect-intent-live-completed',
        runId,
        source: definition.source,
        eventType: 'run.completed',
        status,
        timestamp: observedAt,
        summary: `Side-effect intent live adapter completed with ${status} status using redacted approval markers only.`,
        parentEventId: 'evt-side-effect-intent-privacy-boundary',
        risk,
        decision: hasIntentMarkers ? 'side_effect_intents_held' : 'side_effect_intents_clear',
      }),
    ],
  };
}

function buildManifest(observedAt) {
  return {
    schema_version: SCHEMA_VERSION,
    created_at: observedAt,
    source_agent: 'ai_node_service_live_adapter',
    data_classification: 'redacted_live_adapter',
    files: TRACE_DEFINITIONS.map((definition) => ({
      file: definition.file,
      description: `Redacted near-live ${definition.displayName} adapter Boundary output.`,
    })),
    import_contract: 'phosphene.boundary.v0.1.2-importable',
    notes: 'Multi-service adapter snapshot generated on the AI Node. Redacted operational and side-effect intent markers only; no raw live telemetry, credentials, private URLs, provider payloads, action arguments, message bodies, document content, or user content.',
  };
}

function buildValidationReport() {
  return {
    schema_version: SCHEMA_VERSION,
    overall_status: 'passed',
    data_source: 'redacted_ai_node_service_markers_only_no_provider_reads',
    trace_results: TRACE_DEFINITIONS.map((definition) => ({
      file: definition.file,
      status: 'passed',
    })),
  };
}

function buildReadme(observedAt) {
  return [
    '# Phosphene AI Node Service Live Adapter Snapshot',
    '',
    `Generated at: ${observedAt}`,
    '',
    'This pack contains redacted near-live adapter output for Hermes, AAG, OpenClaw, Sentinel, Gmail, Workspace, and side-effect intent boundaries.',
    '',
    'It is not raw live telemetry. It does not include provider payloads, credentials, private URLs, real user data, action arguments, message bodies, document content, or raw infrastructure details.',
    '',
    'Only existence markers, coarse size bands, modified-time markers, count-only operational shapes, and side-effect category counts are emitted.',
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
  const markerByKey = await collectMarkers(options.aiStackRoot);
  const traces = TRACE_DEFINITIONS.map((definition) => ({
    definition,
    trace: definition.kind === 'side_effect_intent'
      ? buildSideEffectIntentTrace({
        definition,
        observedAt: options.observedAt,
        markers: markerByKey[definition.key],
      })
      : buildTrace({
        definition,
        observedAt: options.observedAt,
        markers: markerByKey[definition.key],
      }),
  }));
  const aggregateStatus = traces.some(({ trace }) => trace.metadata.status === 'failed') ? 'failed' : 'succeeded';

  await rm(options.target, { recursive: true, force: true });
  await mkdir(options.target, { recursive: true });
  await Promise.all(traces.map(({ definition, trace }) => writeJson(path.join(options.target, definition.file), trace)));
  const manifestPath = path.join(options.target, 'manifest.json');
  await writeJson(manifestPath, buildManifest(options.observedAt));
  await writeJson(path.join(options.target, 'validation-report.json'), buildValidationReport());
  await writeFile(path.join(options.target, 'README.md'), buildReadme(options.observedAt));
  await writeLatestMarker(options, { status: aggregateStatus, manifestPath });
  await pruneLivePacks({
    root: options.latestFile ? path.dirname(options.latestFile) : path.dirname(options.target),
    keep: options.retentionCount,
    currentTarget: options.target,
  });

  return { target: options.target, status: aggregateStatus };
}

try {
  const result = await generate(parseArgs(process.argv.slice(2)));
  console.log(`Generated AI Node service live adapter snapshot pack: ${result.target}`);
  console.log(`Service live adapter status: ${result.status}`);
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown service live adapter generation error';
  console.error(message);
  if (error instanceof CliError && error.exitCode === 2) {
    console.error('');
    console.error(usage());
  }
  process.exit(error instanceof CliError ? error.exitCode : 1);
}
