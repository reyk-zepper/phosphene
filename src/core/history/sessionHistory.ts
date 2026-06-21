import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';

export interface SessionHistoryEntry {
  id: string;
  graphId: string;
  dedupeKey: string;
  promptPreview: string;
  modelLabel: string;
  modelProvider: ReasoningGraph['model']['provider'];
  modelName: string;
  createdAt: number;
  updatedAt: number;
  nodeCount: number;
  totalTokens: number;
  graph: ReasoningGraph;
}

interface SessionHistoryEntryOptions {
  now?: number;
  maxPromptLength?: number;
}

interface UpsertSessionHistoryOptions {
  limit?: number;
}

const DEFAULT_PROMPT_PREVIEW_LENGTH = 96;
export const DEFAULT_SESSION_HISTORY_LIMIT = 12;

const SECRET_PATTERNS = [
  /\bauthorization\s*:\s*bearer\b/i,
  /\bbearer\s+[a-z0-9._~+/-]{12,}/i,
  /\b(api[_-]?key|password|token|secret)\s*[:=]\s*\S+/i,
  /\bsk-(ant-|proj-)?[a-z0-9_-]{8,}/i,
  /\bgh[pousr]_[a-z0-9_]{20,}/i,
  /\bxox[baprs]-[a-z0-9-]{12,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export function createSessionHistoryEntry(
  graph: ReasoningGraph,
  options: SessionHistoryEntryOptions = {}
): SessionHistoryEntry | null {
  if (!isGraphSafeForHistory(graph)) return null;

  const modelProvider = graph.model.provider;
  const modelName = graph.model.model;
  const dedupeKey = createDedupeKey(graph.prompt, modelProvider, modelName);

  return {
    id: `${safeIdPart(graph.id)}:${safeIdPart(modelProvider)}:${safeIdPart(modelName)}`,
    graphId: graph.id,
    dedupeKey,
    promptPreview: truncatePrompt(graph.prompt, options.maxPromptLength ?? DEFAULT_PROMPT_PREVIEW_LENGTH),
    modelLabel: graph.model.displayName,
    modelProvider,
    modelName,
    createdAt: graph.createdAt,
    updatedAt: options.now ?? Date.now(),
    nodeCount: graph.metadata.nodeCount,
    totalTokens: graph.metadata.totalTokens,
    graph,
  };
}

export function upsertSessionHistory(
  current: SessionHistoryEntry[],
  entry: SessionHistoryEntry,
  options: UpsertSessionHistoryOptions = {}
): SessionHistoryEntry[] {
  const limit = Math.max(1, Math.floor(options.limit ?? DEFAULT_SESSION_HISTORY_LIMIT));
  const next = [
    entry,
    ...current.filter((item) => item.dedupeKey !== entry.dedupeKey && item.id !== entry.id),
  ];

  return next
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function isGraphSafeForHistory(graph: ReasoningGraph): boolean {
  const texts = [
    graph.id,
    graph.prompt,
    graph.model.displayName,
    graph.model.model,
    ...flattenNodeTexts(graph.rootNode),
  ];

  return texts.every((text) => !containsSecretLikeText(text));
}

function flattenNodeTexts(root: ReasoningNode): string[] {
  const texts: string[] = [];

  function walk(node: ReasoningNode) {
    texts.push(node.id, node.summary, node.content);
    if (node.label) texts.push(node.label);
    if (node.metadata) {
      for (const [key, value] of Object.entries(node.metadata)) {
        texts.push(key, value);
      }
    }
    node.children.forEach(walk);
  }

  walk(root);
  return texts;
}

function containsSecretLikeText(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

function createDedupeKey(prompt: string, provider: string, model: string): string {
  return [normalizePrompt(prompt), provider.toLowerCase(), model.toLowerCase()].join('|');
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ').toLowerCase();
}

function truncatePrompt(prompt: string, maxLength: number): string {
  const normalized = prompt.trim().replace(/\s+/g, ' ');
  const safeMax = Math.max(12, Math.floor(maxLength));
  if (normalized.length <= safeMax) return normalized;

  const slice = normalized.slice(0, safeMax);
  const wordBoundary = slice.lastIndexOf(' ');
  const clipped = wordBoundary > 16 ? slice.slice(0, wordBoundary) : slice;
  return `${clipped.replace(/[,.!?;:]+$/, '')}...`;
}

function safeIdPart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'session';
}
