import { BOUNDARY_TRACE_SCHEMA_VERSION } from './types';

export const DEFAULT_CANARY_STATUS_BASE_PATH = '/snapshots/canary';
export const DEFAULT_CANARY_FRESHNESS_WINDOW_MS = 30 * 60 * 1000;

export type CanaryStatusLoadStatus = 'available' | 'blocked' | 'unavailable';
export type CanaryStatusDisplayStatus = CanaryStatusLoadStatus | 'checking';
export type CanaryStatusFreshness = 'fresh' | 'stale' | 'unknown';

export interface CanaryStatusMarker {
  updatedAt: string;
  sourceAgent: string;
  dataClassification: string;
  latestPack: string;
  canaryStatus: string;
  manifestFile: string;
  manifestSha256: string;
  retentionCount?: number;
}

export interface CanaryStatusLoadResult {
  status: CanaryStatusLoadStatus;
  basePath: string;
  marker?: CanaryStatusMarker;
  errors: string[];
  loadedAt: string;
}

export interface CanaryStatusDisplayState {
  title: string;
  status: CanaryStatusDisplayStatus;
  statusLabel: string;
  freshness: CanaryStatusFreshness;
  role: 'status' | 'alert';
  summary: string;
  meta: Array<{ label: string; value: string }>;
  errors: string[];
}

type CanaryStatusFetcher = (input: string, init?: RequestInit) => Promise<Response>;

const PACK_PATTERN = /^ai-node-canary-\d{8}T\d{6}Z$/;
const MANIFEST_SHA_PATTERN = /^sha256:[a-f0-9]{64}$/;
const FORBIDDEN_TEXT = /(?:\/Users\/|https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:bearer|oauth|api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|session[_-]?cookie)\b|sk-[A-Za-z0-9_-]{12,})/i;

function joinStatusPath(basePath: string, fileName: string): string {
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

async function fetchText(fetcher: CanaryStatusFetcher, url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
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

function validateLatestMarker(text: string): { marker?: CanaryStatusMarker; errors: string[] } {
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
  let canaryStatus = '';
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
  if (parsed.source_agent !== 'ai_node_canary') {
    errors.push('latest.json: source_agent must be ai_node_canary');
  }
  if (parsed.data_classification !== 'redacted_operational_canary') {
    errors.push('latest.json: data_classification must be redacted_operational_canary');
  }
  if (!isNonEmptyString(parsed.latest_pack) || !PACK_PATTERN.test(parsed.latest_pack)) {
    errors.push('latest.json: latest_pack must be a redacted ai-node-canary pack name');
  } else {
    latestPack = parsed.latest_pack;
  }
  if (!isNonEmptyString(parsed.canary_status)) {
    errors.push('latest.json: canary_status must be a non-empty string');
  } else {
    canaryStatus = parsed.canary_status;
  }
  if (
    !isNonEmptyString(parsed.manifest_file)
    || !isNonEmptyString(parsed.latest_pack)
    || parsed.manifest_file !== manifestReferenceForPack(parsed.latest_pack)
  ) {
    errors.push('latest.json: manifest_file must be a relative canary manifest reference');
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
      sourceAgent: 'ai_node_canary',
      dataClassification: 'redacted_operational_canary',
      latestPack,
      canaryStatus,
      manifestFile,
      manifestSha256,
      retentionCount,
    },
    errors: [],
  };
}

function shortenSha(value: string): string {
  return `${value.slice(0, 15)}...`;
}

function markerAgeMs(marker: CanaryStatusMarker | undefined, now: Date): number | undefined {
  if (!marker) return undefined;
  return Math.max(0, now.getTime() - Date.parse(marker.updatedAt));
}

function markerFreshness(marker: CanaryStatusMarker | undefined, now: Date): CanaryStatusFreshness {
  const age = markerAgeMs(marker, now);
  if (age === undefined) return 'unknown';
  return age <= DEFAULT_CANARY_FRESHNESS_WINDOW_MS ? 'fresh' : 'stale';
}

function ageLabel(ageMs: number): string {
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function statusLabel(result: CanaryStatusLoadResult | undefined, freshness: CanaryStatusFreshness): string {
  if (!result) return 'checking';
  if (result.status !== 'available') return result.status;
  if (freshness === 'stale') return 'stale';
  return result.marker?.canaryStatus ?? 'unknown';
}

function summary(result: CanaryStatusLoadResult | undefined, basePath: string, freshness: CanaryStatusFreshness): string {
  if (!result) return `Checking ${basePath} for a redacted AI Node canary marker.`;
  if (result.status === 'available' && result.marker) {
    if (freshness === 'stale') {
      return `AI Node canary marker is stale; last ${result.marker.canaryStatus} at ${result.marker.updatedAt}.`;
    }
    return `AI Node canary ${result.marker.canaryStatus} at ${result.marker.updatedAt}.`;
  }
  if (result.status === 'blocked') return 'AI Node canary marker blocked. Static demo traces remain available.';
  return `No AI Node canary marker at ${result.basePath}.`;
}

export function createCanaryStatusDisplayState(
  result?: CanaryStatusLoadResult,
  basePath = DEFAULT_CANARY_STATUS_BASE_PATH,
  now = new Date()
): CanaryStatusDisplayState {
  const marker = result?.marker;
  const status: CanaryStatusDisplayStatus = result?.status ?? 'checking';
  const freshness = markerFreshness(marker, now);
  const age = markerAgeMs(marker, now);
  const meta: Array<{ label: string; value: string }> = [];

  if (marker) {
    meta.push({ label: 'Freshness', value: freshness === 'stale' ? 'Stale' : 'Fresh' });
    if (age !== undefined) meta.push({ label: 'Age', value: ageLabel(age) });
    if (freshness === 'stale') meta.push({ label: 'Canary', value: marker.canaryStatus });
    meta.push({ label: 'Latest pack', value: marker.latestPack });
    meta.push({ label: 'Manifest hash', value: shortenSha(marker.manifestSha256) });
    if (marker.retentionCount) meta.push({ label: 'Retention', value: `${marker.retentionCount} packs` });
  }
  meta.push({ label: 'Telemetry', value: 'No live telemetry' });

  return {
    title: 'AI Node Canary',
    status,
    statusLabel: statusLabel(result, freshness),
    freshness,
    role: status === 'blocked' || freshness === 'stale' ? 'alert' : 'status',
    summary: summary(result, basePath, freshness),
    meta,
    errors: result?.errors ?? [],
  };
}

export async function loadCanaryStatus(
  fetcher: CanaryStatusFetcher = fetch,
  basePath = DEFAULT_CANARY_STATUS_BASE_PATH
): Promise<CanaryStatusLoadResult> {
  const loadedAt = new Date().toISOString();
  const latestUrl = joinStatusPath(basePath, 'latest.json');
  const latest = await fetchText(fetcher, latestUrl);

  if (!latest.ok) {
    return {
      status: 'unavailable',
      basePath,
      errors: [`latest marker unavailable: ${latest.error}`],
      loadedAt,
    };
  }

  const validated = validateLatestMarker(latest.text);
  if (!validated.marker) {
    return {
      status: 'blocked',
      basePath,
      errors: validated.errors,
      loadedAt,
    };
  }

  return {
    status: 'available',
    basePath,
    marker: validated.marker,
    errors: [],
    loadedAt,
  };
}
