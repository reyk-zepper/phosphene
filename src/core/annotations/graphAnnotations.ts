import { flattenGraph } from '@/core/graph/traversal';
import type { ReasoningGraph } from '@/core/parser/types';

export const GRAPH_ANNOTATION_SCHEMA_VERSION = 'phosphene.annotations.v0.1.37' as const;

export type GraphAnnotationScope = 'graph' | 'node';
export type GraphAnnotationStatus = 'open' | 'question' | 'resolved';
export type GraphAnnotationPriority = 'low' | 'medium' | 'high';

export interface GraphAnnotation {
  id: string;
  graphId: string;
  nodeId?: string;
  scope: GraphAnnotationScope;
  author: string;
  body: string;
  status: GraphAnnotationStatus;
  priority: GraphAnnotationPriority;
  createdAt: number;
  updatedAt: number;
}

export interface GraphAnnotationInput {
  graphId: string;
  nodeId?: string;
  author: string;
  body: string;
  status?: GraphAnnotationStatus;
  priority?: GraphAnnotationPriority;
  now?: number;
  id?: string;
}

export interface GraphAnnotationSummary {
  graphId: string;
  total: number;
  graphLevel: number;
  nodeAnchored: number;
  open: number;
  questions: number;
  resolved: number;
  highPriority: number;
  annotatedNodeIds: string[];
}

export interface GraphAnnotationBundle {
  schema_version: typeof GRAPH_ANNOTATION_SCHEMA_VERSION;
  source: 'phosphene_collaborative_annotation';
  data_classification: 'client_local_review_notes';
  exported_at: string;
  graph_id: string;
  graph_label: string;
  annotation_count: number;
  annotations: GraphAnnotation[];
}

export type GraphAnnotationImportResult =
  | { status: 'imported'; graphId: string; annotations: GraphAnnotation[] }
  | { status: 'blocked'; errors: string[] };

const SECRET_PATTERNS = [
  /\bauthorization\s*:\s*bearer\b/i,
  /\bbearer\s+[a-z0-9._~+/-]{12,}/i,
  /\b(api[_-]?key|password|token|secret)\s*[:=]\s*\S+/i,
  /\bsk-(ant-|proj-)?[a-z0-9_-]{8,}/i,
  /\bgh[pousr]_[a-z0-9_]{20,}/i,
  /\bxox[baprs]-[a-z0-9-]{12,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export function createGraphAnnotation(input: GraphAnnotationInput): GraphAnnotation {
  const graphId = input.graphId.trim();
  const nodeId = input.nodeId?.trim();
  const author = input.author.trim();
  const body = input.body.trim();
  const now = input.now ?? Date.now();

  if (!graphId) throw new Error('Annotation graph id is required.');
  if (!author) throw new Error('Annotation author is required.');
  if (!body) throw new Error('Annotation body is required.');

  return {
    id: input.id ?? createAnnotationId(graphId, nodeId, now, body),
    graphId,
    ...(nodeId ? { nodeId } : {}),
    scope: nodeId ? 'node' : 'graph',
    author,
    body,
    status: input.status ?? 'open',
    priority: input.priority ?? 'medium',
    createdAt: now,
    updatedAt: now,
  };
}

export function summarizeGraphAnnotations(
  graph: ReasoningGraph,
  annotations: GraphAnnotation[]
): GraphAnnotationSummary {
  const scoped = annotations.filter((annotation) => annotation.graphId === graph.id);
  const annotatedNodeIds = Array.from(
    new Set(scoped.flatMap((annotation) => (annotation.nodeId ? [annotation.nodeId] : [])))
  ).sort();

  return {
    graphId: graph.id,
    total: scoped.length,
    graphLevel: scoped.filter((annotation) => annotation.scope === 'graph').length,
    nodeAnchored: scoped.filter((annotation) => annotation.scope === 'node').length,
    open: scoped.filter((annotation) => annotation.status === 'open').length,
    questions: scoped.filter((annotation) => annotation.status === 'question').length,
    resolved: scoped.filter((annotation) => annotation.status === 'resolved').length,
    highPriority: scoped.filter((annotation) => annotation.priority === 'high').length,
    annotatedNodeIds,
  };
}

export function createGraphAnnotationBundle(
  graph: ReasoningGraph,
  annotations: GraphAnnotation[],
  options: { exportedAt?: Date } = {}
): GraphAnnotationBundle {
  const scoped = annotations.filter((annotation) => annotation.graphId === graph.id);
  const exportedAt = options.exportedAt ?? new Date();

  return {
    schema_version: GRAPH_ANNOTATION_SCHEMA_VERSION,
    source: 'phosphene_collaborative_annotation',
    data_classification: 'client_local_review_notes',
    exported_at: exportedAt.toISOString(),
    graph_id: graph.id,
    graph_label: graph.model.displayName,
    annotation_count: scoped.length,
    annotations: scoped,
  };
}

export function parseGraphAnnotationBundle(
  input: string,
  graph?: ReasoningGraph
): GraphAnnotationImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return blocked('Annotation bundle is not valid JSON.');
  }

  if (!isRecord(parsed)) return blocked('Annotation bundle must be a JSON object.');
  if (parsed.schema_version !== GRAPH_ANNOTATION_SCHEMA_VERSION) {
    return blocked('Annotation bundle schema is unsupported.');
  }
  if (parsed.source !== 'phosphene_collaborative_annotation') {
    return blocked('Annotation bundle source is unsupported.');
  }
  if (parsed.data_classification !== 'client_local_review_notes') {
    return blocked('Annotation bundle data classification is unsupported.');
  }
  if (typeof parsed.graph_id !== 'string' || !parsed.graph_id.trim()) {
    return blocked('Annotation bundle graph id is invalid.');
  }
  if (graph && parsed.graph_id !== graph.id) {
    return blocked('Annotation bundle belongs to a different graph.');
  }
  if (!Array.isArray(parsed.annotations)) {
    return blocked('Annotation bundle annotations are invalid.');
  }

  const annotations: GraphAnnotation[] = [];
  for (const item of parsed.annotations) {
    if (!isGraphAnnotation(item, parsed.graph_id)) {
      return blocked('Annotation bundle contains an invalid annotation.');
    }
    annotations.push(item);
  }

  if (containsSecretLikeAnnotationText(annotations)) {
    return blocked('Annotation bundle contains secret-like content.');
  }

  if (graph) {
    const nodeIds = new Set(flattenGraph(graph.rootNode).map((node) => node.id));
    if (annotations.some((annotation) => annotation.nodeId && !nodeIds.has(annotation.nodeId))) {
      return blocked('Annotation references a node that is not in this graph.');
    }
  }

  return {
    status: 'imported',
    graphId: parsed.graph_id,
    annotations,
  };
}

function createAnnotationId(graphId: string, nodeId: string | undefined, now: number, body: string): string {
  return `ann-${safeIdPart(graphId)}-${safeIdPart(nodeId ?? 'graph')}-${now}-${hashText(body)}`;
}

function isGraphAnnotation(input: unknown, graphId: string): input is GraphAnnotation {
  if (!isRecord(input)) return false;
  if (!nonEmptyString(input.id)) return false;
  if (input.graphId !== graphId) return false;
  if (input.scope !== 'graph' && input.scope !== 'node') return false;
  if (input.scope === 'node' && !nonEmptyString(input.nodeId)) return false;
  if (input.scope === 'graph' && input.nodeId != null) return false;
  if (!nonEmptyString(input.author) || !nonEmptyString(input.body)) return false;
  if (!['open', 'question', 'resolved'].includes(String(input.status))) return false;
  if (!['low', 'medium', 'high'].includes(String(input.priority))) return false;
  return [input.createdAt, input.updatedAt].every(
    (value) => typeof value === 'number' && Number.isFinite(value)
  );
}

function containsSecretLikeAnnotationText(annotations: GraphAnnotation[]): boolean {
  return annotations.some((annotation) =>
    [annotation.author, annotation.body].some((text) =>
      SECRET_PATTERNS.some((pattern) => pattern.test(text))
    )
  );
}

function blocked(...errors: string[]): GraphAnnotationImportResult {
  return { status: 'blocked', errors };
}

function nonEmptyString(input: unknown): input is string {
  return typeof input === 'string' && input.trim().length > 0;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function safeIdPart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'annotation';
}

function hashText(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}
