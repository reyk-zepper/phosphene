import { parseTraceIntakeFiles, type TraceIntakeBatchResult } from './intake';
import type { NodeTrace } from './types';

export const DEFAULT_PUBLISHED_SNAPSHOT_BASE_PATH = '/snapshots/current';

export type PublishedSnapshotStatus = 'available' | 'partial' | 'blocked' | 'unavailable';

export interface PublishedSnapshotLoadResult {
  status: PublishedSnapshotStatus;
  basePath: string;
  traces: NodeTrace[];
  intakeResult?: TraceIntakeBatchResult;
  errors: string[];
  loadedAt: string;
}

type SnapshotFetcher = (input: string, init?: RequestInit) => Promise<Response>;

function joinSnapshotPath(basePath: string, fileName: string): string {
  const base = basePath.replace(/\/+$/, '');
  const file = fileName.replace(/^\/+/, '');
  return `${base}/${file}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    files.push(item.file);
  });

  return { files: [...new Set(files)], errors };
}

async function fetchText(fetcher: SnapshotFetcher, url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetcher(url, { cache: 'no-store' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown fetch error';
    return { ok: false, error: `${url}: ${message}` };
  }

  if (!response.ok) return { ok: false, error: `${url}: HTTP ${response.status}` };
  return { ok: true, text: await response.text() };
}

function flattenIntakeErrors(result: TraceIntakeBatchResult): string[] {
  return result.items.flatMap((item) => item.errors.map((error) => `${item.fileName}: ${error}`));
}

function statusFromIntake(result: TraceIntakeBatchResult): PublishedSnapshotStatus {
  if (result.summary.acceptedTraceCount > 0 && result.summary.blockedTraceCount === 0) return 'available';
  if (result.summary.acceptedTraceCount > 0) return 'partial';
  return 'blocked';
}

export async function loadPublishedSnapshot(
  fetcher: SnapshotFetcher = fetch,
  basePath = DEFAULT_PUBLISHED_SNAPSHOT_BASE_PATH
): Promise<PublishedSnapshotLoadResult> {
  const loadedAt = new Date().toISOString();
  const manifestUrl = joinSnapshotPath(basePath, 'manifest.json');
  const manifest = await fetchText(fetcher, manifestUrl);

  if (!manifest.ok) {
    return {
      status: 'unavailable',
      basePath,
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
      traces: [],
      errors: manifestFiles.errors,
      loadedAt,
    };
  }

  const inputs = [{ name: 'manifest.json', text: manifest.text }];
  for (const fileName of manifestFiles.files) {
    const file = await fetchText(fetcher, joinSnapshotPath(basePath, fileName));
    if (!file.ok) {
      inputs.push({ name: fileName, text: '{' });
      continue;
    }
    inputs.push({ name: fileName, text: file.text });
  }

  const validationReport = await fetchText(fetcher, joinSnapshotPath(basePath, 'validation-report.json'));
  if (validationReport.ok) {
    inputs.push({ name: 'validation-report.json', text: validationReport.text });
  }

  const intakeResult = parseTraceIntakeFiles(inputs);
  const errors = flattenIntakeErrors(intakeResult);

  return {
    status: statusFromIntake(intakeResult),
    basePath,
    traces: intakeResult.traces,
    intakeResult,
    errors,
    loadedAt,
  };
}
