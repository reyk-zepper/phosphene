import {
  parsePortableSessionBundle,
  type PortableSessionImportResult,
} from './sessionBundle';

export const DEFAULT_HOSTED_SESSION_BASE_PATH = '/sessions/hosted';
export const HOSTED_SESSION_MARKER_SCHEMA_VERSION = 'phosphene.hosted_session.v0.1.34' as const;

export type HostedSessionStatus = 'available' | 'blocked' | 'unavailable';

export interface HostedSessionMarker {
  updatedAt: string;
  source: 'phosphene_hosted_session';
  dataClassification: 'public_reasoning_session_bundle';
  latestSession: string;
  sessionFile: string;
  sessionSha256: string;
  retentionCount?: number;
}

export interface HostedSessionLoadResult {
  status: HostedSessionStatus;
  basePath: string;
  marker?: HostedSessionMarker;
  bundleText?: string;
  importResult?: PortableSessionImportResult;
  errors: string[];
  loadedAt: string;
}

type HostedSessionFetcher = (input: string, init?: RequestInit) => Promise<Response>;

const SESSION_PATTERN = /^hosted-session-\d{8}T\d{6}Z$/;
const SHA_PATTERN = /^sha256:[a-f0-9]{64}$/;
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

async function fetchText(fetcher: HostedSessionFetcher, url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
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

function sessionReferenceForPack(pack: string): string {
  return `${pack}/session.json`;
}

function validateLatestMarker(text: string): { marker?: HostedSessionMarker; errors: string[] } {
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
  let latestSession = '';
  let sessionFile = '';
  let sessionSha256 = '';
  let retentionCount: number | undefined;

  if (parsed.schema_version !== HOSTED_SESSION_MARKER_SCHEMA_VERSION) {
    errors.push(`latest.json: schema_version must be ${HOSTED_SESSION_MARKER_SCHEMA_VERSION}`);
  }
  if (!isNonEmptyString(parsed.updated_at) || Number.isNaN(Date.parse(parsed.updated_at))) {
    errors.push('latest.json: updated_at must be a valid ISO timestamp');
  } else {
    updatedAt = parsed.updated_at;
  }
  if (parsed.source !== 'phosphene_hosted_session') {
    errors.push('latest.json: source must be phosphene_hosted_session');
  }
  if (parsed.data_classification !== 'public_reasoning_session_bundle') {
    errors.push('latest.json: data_classification must be public_reasoning_session_bundle');
  }
  if (!isNonEmptyString(parsed.latest_session) || !SESSION_PATTERN.test(parsed.latest_session)) {
    errors.push('latest.json: latest_session must be a hosted-session pack name');
  } else {
    latestSession = parsed.latest_session;
  }
  if (
    !isNonEmptyString(parsed.session_file)
    || !isNonEmptyString(parsed.latest_session)
    || parsed.session_file !== sessionReferenceForPack(parsed.latest_session)
  ) {
    errors.push('latest.json: session_file must be a relative hosted session reference');
  } else {
    sessionFile = parsed.session_file;
  }
  if (!isNonEmptyString(parsed.session_sha256) || !SHA_PATTERN.test(parsed.session_sha256)) {
    errors.push('latest.json: session_sha256 must be a sha256 digest');
  } else {
    sessionSha256 = parsed.session_sha256;
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
      source: 'phosphene_hosted_session',
      dataClassification: 'public_reasoning_session_bundle',
      latestSession,
      sessionFile,
      sessionSha256,
      retentionCount,
    },
    errors: [],
  };
}

async function sha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function loadHostedSessionBundle(
  fetcher: HostedSessionFetcher = fetch,
  basePath = DEFAULT_HOSTED_SESSION_BASE_PATH
): Promise<HostedSessionLoadResult> {
  const loadedAt = new Date().toISOString();
  const latest = await fetchText(fetcher, joinPath(basePath, 'latest.json'));

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

  const marker = validated.marker;
  const bundle = await fetchText(fetcher, joinPath(basePath, marker.sessionFile));
  if (!bundle.ok) {
    return {
      status: 'blocked',
      basePath,
      marker,
      errors: [`session bundle unavailable: ${bundle.error}`],
      loadedAt,
    };
  }

  const actualSha = await sha256(bundle.text);
  if (actualSha !== marker.sessionSha256) {
    return {
      status: 'blocked',
      basePath,
      marker,
      bundleText: bundle.text,
      errors: ['session.json: sha256 digest did not match latest marker'],
      loadedAt,
    };
  }

  const importResult = parsePortableSessionBundle(bundle.text);
  if (importResult.status !== 'imported') {
    return {
      status: 'blocked',
      basePath,
      marker,
      bundleText: bundle.text,
      importResult,
      errors: importResult.errors,
      loadedAt,
    };
  }

  return {
    status: 'available',
    basePath,
    marker,
    bundleText: bundle.text,
    importResult,
    errors: [],
    loadedAt,
  };
}
