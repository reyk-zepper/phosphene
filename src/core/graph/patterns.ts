import type { ReasoningGraph, ReasoningNode } from '../parser/types';

export type ReasoningPatternId =
  | 'evidence_backed_hypothesis'
  | 'revision_loop'
  | 'decision_tradeoff'
  | 'uncertainty_probe';

export interface ReasoningPatternDefinition {
  id: ReasoningPatternId;
  label: string;
  description: string;
  queryHint: string;
}

export interface ReasoningPatternMatch {
  id: string;
  patternId: ReasoningPatternId;
  primaryNodeId: string;
  nodeIds: string[];
  summary: string;
  confidence: number | null;
}

export interface ReasoningPatternGroup extends ReasoningPatternDefinition {
  matches: ReasoningPatternMatch[];
}

export interface ReasoningPatternReport {
  catalog: ReasoningPatternDefinition[];
  patterns: ReasoningPatternGroup[];
  totalMatches: number;
  coverage: number;
}

interface NodeVisit {
  node: ReasoningNode;
  parentId?: string;
  index: number;
}

export const REASONING_PATTERN_LIBRARY: ReasoningPatternDefinition[] = [
  {
    id: 'evidence_backed_hypothesis',
    label: 'Evidence-backed hypothesis',
    description: 'A hypothesis is grounded by one or more evidence nodes before the final answer.',
    queryHint: 'type:hypothesis evidence',
  },
  {
    id: 'revision_loop',
    label: 'Revision loop',
    description: 'The model corrects, revises, or changes course after an earlier reasoning step.',
    queryHint: 'pattern:mind-change',
  },
  {
    id: 'decision_tradeoff',
    label: 'Decision tradeoff',
    description: 'A decision is anchored in an explicit comparison or tradeoff branch.',
    queryHint: 'type:decision',
  },
  {
    id: 'uncertainty_probe',
    label: 'Uncertainty probe',
    description: 'A question or low-confidence node marks uncertainty that deserves inspection.',
    queryHint: 'type:question confidence:low',
  },
];

export function detectReasoningPatterns(graph: ReasoningGraph): ReasoningPatternReport {
  const visits = flattenWithParents(graph.rootNode);
  const visitById = new Map(visits.map((visit) => [visit.node.id, visit]));
  const matchesByPattern = new Map<ReasoningPatternId, ReasoningPatternMatch[]>();
  const catalogOrder = new Map(REASONING_PATTERN_LIBRARY.map((definition, index) => [definition.id, index]));

  addMatches(matchesByPattern, 'evidence_backed_hypothesis', detectEvidenceBackedHypotheses(visits));
  addMatches(matchesByPattern, 'revision_loop', detectRevisionLoops(visits));
  addMatches(matchesByPattern, 'decision_tradeoff', detectDecisionTradeoffs(visits, visitById));
  addMatches(matchesByPattern, 'uncertainty_probe', detectUncertaintyProbes(visits));

  const patterns = REASONING_PATTERN_LIBRARY
    .map((definition) => ({
      ...definition,
      matches: matchesByPattern.get(definition.id) ?? [],
    }))
    .filter((pattern) => pattern.matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length || (catalogOrder.get(a.id) ?? 0) - (catalogOrder.get(b.id) ?? 0));

  const matchedNodeIds = new Set(patterns.flatMap((pattern) => pattern.matches.flatMap((match) => match.nodeIds)));
  const totalMatches = patterns.reduce((sum, pattern) => sum + pattern.matches.length, 0);

  return {
    catalog: REASONING_PATTERN_LIBRARY,
    patterns,
    totalMatches,
    coverage: ratio(matchedNodeIds.size, visits.length),
  };
}

function detectEvidenceBackedHypotheses(visits: NodeVisit[]): ReasoningPatternMatch[] {
  return visits.flatMap((visit) => {
    if (visit.node.type !== 'hypothesis') return [];

    const evidenceNodes = collectDescendants(visit.node).filter((node) => node.type === 'evidence');
    return evidenceNodes.map((evidenceNode) => ({
      id: `evidence_backed_hypothesis:${visit.node.id}:${evidenceNode.id}`,
      patternId: 'evidence_backed_hypothesis' as const,
      primaryNodeId: visit.node.id,
      nodeIds: [visit.node.id, evidenceNode.id],
      summary: `${shortSummary(visit.node)} -> ${shortSummary(evidenceNode)}`,
      confidence: averageConfidence([visit.node, evidenceNode]),
    }));
  });
}

function detectRevisionLoops(visits: NodeVisit[]): ReasoningPatternMatch[] {
  return visits
    .filter((visit) => visit.node.type === 'revision' || isRevisionText(visit.node))
    .map((visit) => ({
      id: `revision_loop:${visit.node.id}`,
      patternId: 'revision_loop' as const,
      primaryNodeId: visit.node.id,
      nodeIds: [visit.node.id],
      summary: shortSummary(visit.node),
      confidence: visit.node.confidence ?? null,
    }));
}

function detectDecisionTradeoffs(
  visits: NodeVisit[],
  visitById: Map<string, NodeVisit>
): ReasoningPatternMatch[] {
  return visits.flatMap((visit) => {
    if (visit.node.type !== 'decision') return [];

    const anchor = findAncestor(visit, visitById, (node) => node.type === 'comparison')
      ?? findAncestor(visit, visitById, (node) => node.type === 'evidence');
    if (!anchor) return [];

    return [{
      id: `decision_tradeoff:${anchor.node.id}:${visit.node.id}`,
      patternId: 'decision_tradeoff' as const,
      primaryNodeId: visit.node.id,
      nodeIds: [anchor.node.id, visit.node.id],
      summary: `${shortSummary(anchor.node)} -> ${shortSummary(visit.node)}`,
      confidence: averageConfidence([anchor.node, visit.node]),
    }];
  });
}

function detectUncertaintyProbes(visits: NodeVisit[]): ReasoningPatternMatch[] {
  return visits
    .filter((visit) => visit.node.type === 'question' || (visit.node.confidence != null && visit.node.confidence < 0.5))
    .map((visit) => ({
      id: `uncertainty_probe:${visit.node.id}`,
      patternId: 'uncertainty_probe' as const,
      primaryNodeId: visit.node.id,
      nodeIds: [visit.node.id],
      summary: shortSummary(visit.node),
      confidence: visit.node.confidence ?? null,
    }));
}

function flattenWithParents(root: ReasoningNode): NodeVisit[] {
  const visits: NodeVisit[] = [];
  const walk = (node: ReasoningNode, parentId?: string) => {
    visits.push({ node, parentId, index: visits.length });
    node.children.forEach((child) => walk(child, node.id));
  };
  walk(root);
  return visits;
}

function collectDescendants(root: ReasoningNode): ReasoningNode[] {
  const nodes: ReasoningNode[] = [];
  const walk = (node: ReasoningNode) => {
    node.children.forEach((child) => {
      nodes.push(child);
      walk(child);
    });
  };
  walk(root);
  return nodes;
}

function findAncestor(
  visit: NodeVisit,
  visitById: Map<string, NodeVisit>,
  predicate: (node: ReasoningNode) => boolean
): NodeVisit | undefined {
  let parentId = visit.parentId;
  while (parentId) {
    const parent = visitById.get(parentId);
    if (!parent) return undefined;
    if (predicate(parent.node)) return parent;
    parentId = parent.parentId;
  }
  return undefined;
}

function addMatches(
  matchesByPattern: Map<ReasoningPatternId, ReasoningPatternMatch[]>,
  id: ReasoningPatternId,
  matches: ReasoningPatternMatch[]
) {
  if (matches.length === 0) return;
  matchesByPattern.set(id, matches);
}

function isRevisionText(node: ReasoningNode): boolean {
  const text = `${node.summary} ${node.content}`.toLowerCase();
  return /\b(wait|actually|reconsider|correct|correction|missed|revise|revision|change mind|changed mind)\b/.test(text);
}

function shortSummary(node: ReasoningNode): string {
  return node.summary || node.label || node.type;
}

function averageConfidence(nodes: ReasoningNode[]): number | null {
  const values = nodes
    .map((node) => node.confidence)
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function ratio(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100) / 100;
}
