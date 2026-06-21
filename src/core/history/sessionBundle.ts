import { buildGraphExportFileName } from '@/core/graph/export';
import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';
import {
  createSessionHistoryEntry,
  isGraphSafeForHistory,
  type SessionHistoryEntry,
} from './sessionHistory';

export const PORTABLE_SESSION_SCHEMA_VERSION = 'phosphene.session.v0.1.25' as const;

export interface PortableSessionBundle {
  schema_version: typeof PORTABLE_SESSION_SCHEMA_VERSION;
  source: 'phosphene_portable_session';
  data_classification: 'client_local_reasoning_session';
  exported_at: string;
  graph_id: string;
  prompt_preview: string;
  graph: ReasoningGraph;
}

export type PortableSessionImportResult =
  | {
      status: 'imported';
      graph: ReasoningGraph;
      historyEntry: SessionHistoryEntry;
    }
  | {
      status: 'blocked';
      errors: string[];
    };

interface PortableSessionBundleOptions {
  exportedAt?: Date;
  maxPromptLength?: number;
}

interface PortableSessionParseOptions {
  now?: number;
}

export function createPortableSessionBundle(
  graph: ReasoningGraph,
  options: PortableSessionBundleOptions = {}
): PortableSessionBundle | null {
  const exportedAt = options.exportedAt ?? new Date();
  const historyEntry = createSessionHistoryEntry(graph, {
    now: exportedAt.getTime(),
    maxPromptLength: options.maxPromptLength,
  });

  if (!historyEntry) return null;

  return {
    schema_version: PORTABLE_SESSION_SCHEMA_VERSION,
    source: 'phosphene_portable_session',
    data_classification: 'client_local_reasoning_session',
    exported_at: exportedAt.toISOString(),
    graph_id: graph.id,
    prompt_preview: historyEntry.promptPreview,
    graph,
  };
}

export function parsePortableSessionBundle(
  input: string,
  options: PortableSessionParseOptions = {}
): PortableSessionImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return blocked('Session bundle is not valid JSON.');
  }

  if (!isRecord(parsed)) return blocked('Session bundle must be a JSON object.');
  if (parsed.schema_version !== PORTABLE_SESSION_SCHEMA_VERSION) {
    return blocked('Session bundle schema is unsupported.');
  }
  if (parsed.source !== 'phosphene_portable_session') {
    return blocked('Session bundle source is unsupported.');
  }
  if (parsed.data_classification !== 'client_local_reasoning_session') {
    return blocked('Session bundle data classification is unsupported.');
  }
  if (typeof parsed.exported_at !== 'string' || Number.isNaN(Date.parse(parsed.exported_at))) {
    return blocked('Session bundle export timestamp is invalid.');
  }

  const graphResult = parseReasoningGraph(parsed.graph);
  if (!graphResult.ok) return blocked(...graphResult.errors);
  if (!isGraphSafeForHistory(graphResult.graph)) {
    return blocked('Session graph contains secret-like content.');
  }

  const historyEntry = createSessionHistoryEntry(graphResult.graph, { now: options.now });
  if (!historyEntry) return blocked('Session graph contains secret-like content.');

  return {
    status: 'imported',
    graph: graphResult.graph,
    historyEntry,
  };
}

export function buildSessionBundleFileName(graphId: string, timestamp = new Date()): string {
  return buildGraphExportFileName(`session-${graphId}`, 'json', timestamp);
}

function blocked(...errors: string[]): PortableSessionImportResult {
  return { status: 'blocked', errors };
}

function parseReasoningGraph(input: unknown): { ok: true; graph: ReasoningGraph } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(input)) return { ok: false, errors: ['Session graph must be a JSON object.'] };

  if (!nonEmptyString(input.id)) errors.push('Session graph id is invalid.');
  if (typeof input.prompt !== 'string') errors.push('Session graph prompt is invalid.');
  if (!isModel(input.model)) errors.push('Session graph model is invalid.');
  if (!isGraphMetadata(input.metadata)) errors.push('Session graph metadata is invalid.');
  if (!isReasoningNode(input.rootNode)) errors.push('Session graph root node is invalid.');
  if (typeof input.createdAt !== 'number' || !Number.isFinite(input.createdAt)) {
    errors.push('Session graph createdAt is invalid.');
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    graph: input as unknown as ReasoningGraph,
  };
}

function isReasoningNode(input: unknown): input is ReasoningNode {
  if (!isRecord(input)) return false;
  if (!nonEmptyString(input.id)) return false;
  if (!['hypothesis', 'analysis', 'conclusion', 'question', 'comparison', 'evidence', 'revision', 'decision'].includes(String(input.type))) {
    return false;
  }
  if (typeof input.content !== 'string' || typeof input.summary !== 'string') return false;
  if (!Array.isArray(input.children)) return false;
  if (typeof input.depth !== 'number' || !Number.isFinite(input.depth)) return false;
  if (typeof input.tokenCount !== 'number' || !Number.isFinite(input.tokenCount)) return false;
  if (typeof input.timestamp !== 'number' || !Number.isFinite(input.timestamp)) return false;
  if (input.confidence != null && (typeof input.confidence !== 'number' || !Number.isFinite(input.confidence))) {
    return false;
  }
  if (input.metadata != null && !isStringRecord(input.metadata)) return false;

  return input.children.every(isReasoningNode);
}

function isModel(input: unknown): input is ReasoningGraph['model'] {
  if (!isRecord(input)) return false;
  if (!['anthropic', 'openai', 'google', 'ollama'].includes(String(input.provider))) return false;
  return nonEmptyString(input.model) && nonEmptyString(input.displayName);
}

function isGraphMetadata(input: unknown): input is ReasoningGraph['metadata'] {
  if (!isRecord(input)) return false;
  return [
    input.totalTokens,
    input.reasoningTokens,
    input.outputTokens,
    input.maxDepth,
    input.branchCount,
    input.nodeCount,
    input.timeToComplete,
  ].every((value) => typeof value === 'number' && Number.isFinite(value));
}

function isStringRecord(input: unknown): input is Record<string, string> {
  if (!isRecord(input)) return false;
  return Object.entries(input).every(([key, value]) => typeof key === 'string' && typeof value === 'string');
}

function nonEmptyString(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
