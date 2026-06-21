import { parseTraceIntakeFiles, type TraceIntakeBatchResult } from './intake';
import { BOUNDARY_TRACE_SCHEMA_VERSION } from './types';
import type { NodeTrace } from './types';

export const DEFAULT_LIVE_ADAPTER_BASE_PATH = '/snapshots/live';
export const DEFAULT_LIVE_ADAPTER_FRESHNESS_WINDOW_MS = 10 * 60 * 1000;
export const DEFAULT_LIVE_ADAPTER_REFRESH_MS = 30 * 1000;

export type LiveAdapterStatus = 'available' | 'partial' | 'blocked' | 'unavailable';
export type LiveAdapterDisplayStatus = LiveAdapterStatus | 'checking';
export type LiveAdapterFreshness = 'fresh' | 'stale' | 'unknown';

export interface LiveAdapterMarker {
  updatedAt: string;
  sourceAgent: 'ai_node_live_adapter';
  dataClassification: 'redacted_live_adapter';
  latestPack: string;
  adapterStatus: string;
  manifestFile: string;
  manifestSha256: string;
  retentionCount?: number;
}

export interface LiveAdapterLoadResult {
  status: LiveAdapterStatus;
  basePath: string;
  marker?: LiveAdapterMarker;
  traces: NodeTrace[];
  intakeResult?: TraceIntakeBatchResult;
  errors: string[];
  loadedAt: string;
}

export interface LiveAdapterDisplayState {
  title: string;
  status: LiveAdapterDisplayStatus;
  statusLabel: string;
  freshness: LiveAdapterFreshness;
  role: 'status' | 'alert';
  summary: string;
  meta: Array<{ label: string; value: string }>;
  errors: string[];
}

export interface LiveAdapterRefreshOptions {
  refreshMs?: number;
  load?: () => Promise<LiveAdapterLoadResult>;
  onResult: (result: LiveAdapterLoadResult) => void;
  setIntervalFn?: (callback: () => void, delay: number) => ReturnType<typeof setInterval>;
  clearIntervalFn?: (handle: ReturnType<typeof setInterval>) => void;
}

type LiveAdapterFetcher = (input: string, init?: RequestInit) => Promise<Response>;

const PACK_PATTERN = /^ai-node-live-\d{8}T\d{6}Z$/;
const MANIFEST_SHA_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SAFE_MANIFEST_FILE_PATTERN = /^[a-z0-9][a-z0-9._-]*\.json$/i;
const FORBIDDEN_TEXT = /(?:\/Users\/|https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:bearer|oauth|api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|session[_-]?cookie)\b|sk-[A-Za-z0-9_-]{12,})/i;

function joinPath(basePath: string, fileName: string): string {
  const base = basePath.replace(/\/+$/, '');
  const file = fileName.replace(/^\/+/, '');
  return `${base}/${file}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

async function fetchText(fetcher: LiveAdapterFetcher, url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetcher(url, { cache: 'no-store' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown fetch error';
    return { ok: false, error: `${url}: ${message}` };
  }

  if (!response.ok) return { ok: false, error: `${url}: HTTP ${response.status}` };
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html') || text.trimStart().toLowerCase().startsWith('<!doctype html')) {
    return { ok: false, error: `${url}: HTML fallback` };
  }
  return { ok: true, text };
}

function manifestReferenceForPack(pack: string): string {
  return `${pack}/manifest.json`;
}

function validateLatestMarker(text: string): { marker?: LiveAdapterMarker; errors: string[] } {
  const hasForbiddenText = FORBIDDEN_TEXT.test(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parse error';
    return { errors: [`latest.json: Invalid JSON: ${message}`] };
  }

  if (!isRecord(parsed)) return { errors: ['latest.json must contain a JSON object'] };

  const errors: string[] = [];
  let updatedAt = '';
  let latestPack = '';
  let adapterStatus = '';
  let manifestFile = '';
  let manifestSha256 = '';
  let retentionCount: number | undefined;

  if (parsed.schema_version !== BOUNDARY_TRACE_SCHEMA_VERSION) {
    errors.push(`latest.json: schema_version must be ${BOUNDARY_TRACE_SCHEMA_VERSION}`);
  }
  if (!isNonEmptyString(parsed.updated_at) || Number.isNaN(Date.parse(parsed.updated_at))) {
    errors.push('latest.json: updated_at must be a valid ISO timestamp');
  } else {
    updatedAt = parsed.updated_at;
  }
  if (parsed.source_agent !== 'ai_node_live_adapter') {
    errors.push('latest.json: source_agent must be ai_node_live_adapter');
  }
  if (parsed.data_classification !== 'redacted_live_adapter') {
    errors.push('latest.json: data_classification must be redacted_live_adapter');
  }
  if (!isNonEmptyString(parsed.latest_pack) || !PACK_PATTERN.test(parsed.latest_pack)) {
    errors.push('latest.json: latest_pack must be a redacted ai-node-live pack name');
  } else {
    latestPack = parsed.latest_pack;
  }
  if (!isNonEmptyString(parsed.adapter_status)) {
    errors.push('latest.json: adapter_status must be a non-empty string');
  } else {
    adapterStatus = parsed.adapter_status;
  }
  if (
    !isNonEmptyString(parsed.manifest_file)
    || !isNonEmptyString(parsed.latest_pack)
    || parsed.manifest_file !== manifestReferenceForPack(parsed.latest_pack)
  ) {
    errors.push('latest.json: manifest_file must be a relative live adapter manifest reference');
  } else {
    manifestFile = parsed.manifest_file;
  }
  if (!isNonEmptyString(parsed.manifest_sha256) || !MANIFEST_SHA_PATTERN.test(parsed.manifest_sha256)) {
    errors.push('latest.json: manifest_sha256 must be a sha256 digest');
  } else {
    manifestSha256 = parsed.manifest_sha256;
  }
  if (parsed.retention_count != null) {
    if (typeof parsed.retention_count === 'number' && Number.isInteger(parsed.retention_count) && parsed.retention_count >= 1) {
      retentionCount = parsed.retention_count;
    } else {
      errors.push('latest.json: retention_count must be a positive integer');
    }
  }
  if (hasForbiddenText) errors.push('latest.json contains forbidden sensitive marker text');

  if (errors.length > 0) return { errors };

  return {
    marker: {
      updatedAt,
      sourceAgent: 'ai_node_live_adapter',
      dataClassification: 'redacted_live_adapter',
      latestPack,
      adapterStatus,
      manifestFile,
      manifestSha256,
      retentionCount,
    },
    errors: [],
  };
}

function readManifestFiles(text: string): { files: string[]; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parse error';
    return { files: [], errors: [`manifest.json: Invalid JSON: ${message}`] };
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.files)) {
    return { files: [], errors: ['manifest.json: files must be an array'] };
  }

  const files: string[] = [];
  const errors: string[] = [];
  parsed.files.forEach((item, index) => {
    if (!isRecord(item) || typeof item.file !== 'string' || item.file.trim().length === 0) {
      errors.push(`manifest.json: files[${index}].file must be a non-empty string`);
      return;
    }
    const fileName = item.file.trim();
    if (!SAFE_MANIFEST_FILE_PATTERN.test(fileName)) {
      errors.push(`manifest.json: files[${index}].file must be a safe relative JSON file name`);
      return;
    }
    files.push(fileName);
  });

  return { files: [...new Set(files)], errors };
}

function flattenIntakeErrors(result: TraceIntakeBatchResult): string[] {
  return result.items.flatMap((item) => item.errors.map((error) => `${item.fileName}: ${error}`));
}

function statusFromIntake(result: TraceIntakeBatchResult): LiveAdapterStatus {
  if (result.summary.acceptedTraceCount > 0 && result.summary.blockedTraceCount === 0) return 'available';
  if (result.summary.acceptedTraceCount > 0) return 'partial';
  return 'blocked';
}

function markerAgeMs(marker: LiveAdapterMarker | undefined, now: Date): number | undefined {
  if (!marker) return undefined;
  return Math.max(0, now.getTime() - Date.parse(marker.updatedAt));
}

function markerFreshness(marker: LiveAdapterMarker | undefined, now: Date): LiveAdapterFreshness {
  const age = markerAgeMs(marker, now);
  if (age === undefined) return 'unknown';
  return age <= DEFAULT_LIVE_ADAPTER_FRESHNESS_WINDOW_MS ? 'fresh' : 'stale';
}

function ageLabel(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function pluralizeTrace(count: number): string {
  return count === 1 ? 'trace' : 'traces';
}

function shortenSha(value: string): string {
  return `${value.slice(0, 15)}...`;
}

function statusLabel(result: LiveAdapterLoadResult | undefined, freshness: LiveAdapterFreshness): string {
  if (!result) return 'checking';
  if (result.status === 'available' && freshness === 'stale') return 'stale';
  if (result.status === 'available' && result.marker) return result.marker.adapterStatus;
  return result.status;
}

function summary(result: LiveAdapterLoadResult | undefined, basePath: string, freshness: LiveAdapterFreshness): string {
  if (!result) return `Checking ${basePath} for redacted AI Node adapter output.`;
  if (result.status === 'available' && result.marker) {
    if (freshness === 'stale') {
      return `AI Node adapter marker is stale; last ${result.marker.adapterStatus} at ${result.marker.updatedAt}.`;
    }
    return `${result.traces.length} redacted near-live ${pluralizeTrace(result.traces.length)} loaded from ${result.marker.latestPack}.`;
  }
  if (result.status === 'partial') {
    const blockedCount = result.intakeResult?.summary.blockedTraceCount ?? 0;
    return `${result.traces.length} redacted near-live ${pluralizeTrace(result.traces.length)} loaded, ${blockedCount} blocked.`;
  }
  if (result.status === 'blocked') return 'AI Node adapter output blocked. Static demo traces remain available.';
  return `No AI Node adapter output at ${result.basePath}.`;
}

export async function loadLiveAdapterSnapshot(
  fetcher: LiveAdapterFetcher = fetch,
  basePath = DEFAULT_LIVE_ADAPTER_BASE_PATH
): Promise<LiveAdapterLoadResult> {
  const loadedAt = new Date().toISOString();
  const latest = await fetchText(fetcher, joinPath(basePath, 'latest.json'));

  if (!latest.ok) {
    return {
      status: 'unavailable',
      basePath,
      traces: [],
      errors: [`latest marker unavailable: ${latest.error}`],
      loadedAt,
    };
  }

  const validated = validateLatestMarker(latest.text);
  if (!validated.marker) {
    return {
      status: 'blocked',
      basePath,
      traces: [],
      errors: validated.errors,
      loadedAt,
    };
  }

  const marker = validated.marker;
  const packBasePath = joinPath(basePath, marker.latestPack);
  const manifest = await fetchText(fetcher, joinPath(basePath, marker.manifestFile));

  if (!manifest.ok) {
    return {
      status: 'blocked',
      basePath,
      marker,
      traces: [],
      errors: [`manifest unavailable: ${manifest.error}`],
      loadedAt,
    };
  }

  const manifestFiles = readManifestFiles(manifest.text);
  if (manifestFiles.errors.length > 0) {
    return {
      status: 'blocked',
      basePath,
      marker,
      traces: [],
      errors: manifestFiles.errors,
      loadedAt,
    };
  }

  const inputs = [{ name: 'manifest.json', text: manifest.text }];
  for (const fileName of manifestFiles.files) {
    const file = await fetchText(fetcher, joinPath(packBasePath, fileName));
    inputs.push({ name: fileName, text: file.ok ? file.text : '{' });
  }

  const validationReport = await fetchText(fetcher, joinPath(packBasePath, 'validation-report.json'));
  if (validationReport.ok) inputs.push({ name: 'validation-report.json', text: validationReport.text });

  const intakeResult = parseTraceIntakeFiles(inputs);
  const errors = flattenIntakeErrors(intakeResult);

  return {
    status: statusFromIntake(intakeResult),
    basePath,
    marker,
    traces: intakeResult.traces,
    intakeResult,
    errors,
    loadedAt,
  };
}

export function createLiveAdapterDisplayState(
  result?: LiveAdapterLoadResult,
  basePath = DEFAULT_LIVE_ADAPTER_BASE_PATH,
  now = new Date()
): LiveAdapterDisplayState {
  const marker = result?.marker;
  const status: LiveAdapterDisplayStatus = result?.status ?? 'checking';
  const freshness = markerFreshness(marker, now);
  const age = markerAgeMs(marker, now);
  const meta: Array<{ label: string; value: string }> = [];

  if (marker) {
    meta.push({ label: 'Freshness', value: freshness === 'stale' ? 'Stale' : 'Fresh' });
    if (age !== undefined) meta.push({ label: 'Age', value: ageLabel(age) });
    if (freshness === 'stale') meta.push({ label: 'Adapter', value: marker.adapterStatus });
    meta.push({ label: 'Latest pack', value: marker.latestPack });
    meta.push({ label: 'Manifest hash', value: shortenSha(marker.manifestSha256) });
    if (marker.retentionCount) meta.push({ label: 'Retention', value: `${marker.retentionCount} packs` });
  }
  meta.push({ label: 'Telemetry', value: 'No raw live telemetry' });

  return {
    title: 'AI Node Live Adapter',
    status,
    statusLabel: statusLabel(result, freshness),
    freshness,
    role: status === 'blocked' || status === 'partial' || freshness === 'stale' ? 'alert' : 'status',
    summary: summary(result, basePath, freshness),
    meta,
    errors: result?.errors ?? [],
  };
}

export function startLiveAdapterRefresh({
  refreshMs = DEFAULT_LIVE_ADAPTER_REFRESH_MS,
  load = () => loadLiveAdapterSnapshot(),
  onResult,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}: LiveAdapterRefreshOptions): () => void {
  let stopped = false;

  const refresh = () => {
    void load().then((result) => {
      if (!stopped) onResult(result);
    });
  };

  refresh();
  const handle = setIntervalFn(refresh, refreshMs);

  return () => {
    stopped = true;
    clearIntervalFn(handle);
  };
}
