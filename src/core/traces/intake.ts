import { parseBoundaryTraceJson } from './boundaryImport';
import { BOUNDARY_TRACE_SCHEMA_VERSION, type NodeTrace } from './types';
import type { BoundaryValidationCheck } from './boundaryValidation';

export interface TraceIntakeFileInput {
  name: string;
  text: string;
}

export type TraceIntakeItemKind = 'trace' | 'manifest' | 'validation_report' | 'ignored';
export type TraceIntakeItemStatus = 'imported' | 'accepted_support' | 'blocked' | 'ignored';
export type TraceIntakeOverallStatus = 'passed' | 'partial' | 'failed';

export interface TraceIntakeManifest {
  schemaVersion: string;
  sourceAgent?: string;
  dataClassification?: string;
  importContract?: string;
  files: Array<{ file: string; description?: string }>;
}

export interface TraceIntakeValidationReport {
  schemaVersion: string;
  overallStatus?: string;
  traceResultCount: number;
  dataSource?: string;
}

export interface TraceIntakeItemResult {
  fileName: string;
  kind: TraceIntakeItemKind;
  status: TraceIntakeItemStatus;
  errors: string[];
  checks?: BoundaryValidationCheck[];
  trace?: NodeTrace;
  manifest?: TraceIntakeManifest;
  validationReport?: TraceIntakeValidationReport;
}

export interface TraceIntakeBatchSummary {
  totalFiles: number;
  acceptedTraceCount: number;
  blockedTraceCount: number;
  supportFileCount: number;
  ignoredFileCount: number;
  overallStatus: TraceIntakeOverallStatus;
}

export interface TraceIntakeBatchResult {
  traces: NodeTrace[];
  items: TraceIntakeItemResult[];
  summary: TraceIntakeBatchSummary;
  manifest?: TraceIntakeManifest;
  validationReport?: TraceIntakeValidationReport;
}

const supportSensitivePatterns: Array<{ id: string; pattern: RegExp }> = [
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

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function supportRedactionErrors(value: unknown): string[] {
  const serialized = JSON.stringify(value);
  return supportSensitivePatterns
    .filter(({ pattern }) => pattern.test(serialized))
    .map(({ id }) => `Support file contains forbidden sensitive pattern: ${id}`);
}

function classifyJson(fileName: string, value: unknown): TraceIntakeItemKind {
  if (!isRecord(value)) return 'ignored';
  if (Array.isArray(value.events) || Array.isArray(value)) return 'trace';
  if (fileName === 'manifest.json' || Array.isArray(value.files)) return 'manifest';
  if (fileName === 'validation-report.json' || Array.isArray(value.trace_results)) return 'validation_report';
  return 'ignored';
}

function readManifest(parsed: unknown): { manifest?: TraceIntakeManifest; errors: string[] } {
  const errors = supportRedactionErrors(parsed);
  if (!isRecord(parsed)) return { errors: ['Manifest JSON must be an object'] };

  if (parsed.schema_version !== BOUNDARY_TRACE_SCHEMA_VERSION) {
    errors.push(`manifest.schema_version must be ${BOUNDARY_TRACE_SCHEMA_VERSION}`);
  }

  if (!Array.isArray(parsed.files)) {
    errors.push('manifest.files must be an array');
    return { errors };
  }

  const files = parsed.files.flatMap((item, index): TraceIntakeManifest['files'] => {
    if (!isRecord(item)) {
      errors.push(`manifest.files[${index}] must be an object`);
      return [];
    }

    const file = stringValue(item.file);
    if (!file) {
      errors.push(`manifest.files[${index}].file must be a non-empty string`);
      return [];
    }

    return [{ file, description: stringValue(item.description) }];
  });

  return {
    errors,
    manifest: errors.length === 0
      ? {
          schemaVersion: BOUNDARY_TRACE_SCHEMA_VERSION,
          sourceAgent: stringValue(parsed.source_agent),
          dataClassification: stringValue(parsed.data_classification),
          importContract: stringValue(parsed.import_contract),
          files,
        }
      : undefined,
  };
}

function readValidationReport(parsed: unknown): { validationReport?: TraceIntakeValidationReport; errors: string[] } {
  const errors = supportRedactionErrors(parsed);
  if (!isRecord(parsed)) return { errors: ['Validation report JSON must be an object'] };

  if (parsed.schema_version !== BOUNDARY_TRACE_SCHEMA_VERSION) {
    errors.push(`validation-report.schema_version must be ${BOUNDARY_TRACE_SCHEMA_VERSION}`);
  }
  if (!Array.isArray(parsed.trace_results)) {
    errors.push('validation-report.trace_results must be an array');
  }

  return {
    errors,
    validationReport: errors.length === 0
      ? {
          schemaVersion: BOUNDARY_TRACE_SCHEMA_VERSION,
          overallStatus: stringValue(parsed.overall_status),
          dataSource: stringValue(parsed.data_source),
          traceResultCount: Array.isArray(parsed.trace_results) ? parsed.trace_results.length : 0,
        }
      : undefined,
  };
}

function parseTraceFile(input: TraceIntakeFileInput): TraceIntakeItemResult {
  const result = parseBoundaryTraceJson(input.text, input.name);
  if (!result.ok) {
    return {
      fileName: input.name,
      kind: 'trace',
      status: 'blocked',
      errors: result.errors,
      checks: result.checks,
    };
  }

  return {
    fileName: input.name,
    kind: 'trace',
    status: 'imported',
    errors: [],
    checks: result.checks,
    trace: result.trace,
  };
}

function parseIntakeFile(input: TraceIntakeFileInput): TraceIntakeItemResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parse error';
    return {
      fileName: input.name,
      kind: 'ignored',
      status: 'blocked',
      errors: [`Invalid JSON: ${message}`],
    };
  }

  const kind = classifyJson(input.name, parsed);

  if (kind === 'trace') return parseTraceFile(input);
  if (kind === 'manifest') {
    const result = readManifest(parsed);
    return {
      fileName: input.name,
      kind,
      status: result.errors.length > 0 ? 'blocked' : 'accepted_support',
      errors: result.errors,
      manifest: result.manifest,
    };
  }
  if (kind === 'validation_report') {
    const result = readValidationReport(parsed);
    return {
      fileName: input.name,
      kind,
      status: result.errors.length > 0 ? 'blocked' : 'accepted_support',
      errors: result.errors,
      validationReport: result.validationReport,
    };
  }

  return {
    fileName: input.name,
    kind,
    status: 'ignored',
    errors: [],
  };
}

function overallStatus(items: TraceIntakeItemResult[], acceptedTraceCount: number): TraceIntakeOverallStatus {
  const blockedCount = items.filter((item) => item.status === 'blocked').length;
  if (blockedCount === 0) return 'passed';
  return acceptedTraceCount > 0 ? 'partial' : 'failed';
}

export function parseTraceIntakeFiles(inputs: TraceIntakeFileInput[]): TraceIntakeBatchResult {
  const items = inputs.map(parseIntakeFile);
  const traces = items.flatMap((item) => (item.trace ? [item.trace] : []));
  const acceptedTraceCount = traces.length;
  const blockedTraceCount = items.filter((item) => item.kind === 'trace' && item.status === 'blocked').length;
  const supportFileCount = items.filter(
    (item) => (item.kind === 'manifest' || item.kind === 'validation_report') && item.status === 'accepted_support'
  ).length;
  const ignoredFileCount = items.filter((item) => item.status === 'ignored').length;

  return {
    traces,
    items,
    summary: {
      totalFiles: inputs.length,
      acceptedTraceCount,
      blockedTraceCount,
      supportFileCount,
      ignoredFileCount,
      overallStatus: overallStatus(items, acceptedTraceCount),
    },
    manifest: items.find((item) => item.manifest)?.manifest,
    validationReport: items.find((item) => item.validationReport)?.validationReport,
  };
}
