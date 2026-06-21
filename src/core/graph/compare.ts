import type { ReasoningGraph, ReasoningNode, ReasoningNodeType } from '../parser/types';
import { flattenGraph } from './traversal';

export type GraphComparisonMetricId =
  | 'nodes'
  | 'depth'
  | 'branches'
  | 'tokens'
  | 'avg_confidence';

export interface GraphComparisonSubject {
  id: string;
  prompt: string;
  modelLabel: string;
}

export interface GraphComparisonMetric {
  id: GraphComparisonMetricId;
  label: string;
  primaryValue: number | null;
  secondaryValue: number | null;
  delta: number | null;
}

export interface GraphTypeDelta {
  type: ReasoningNodeType;
  label: string;
  primaryCount: number;
  secondaryCount: number;
  delta: number;
}

export interface GraphComparisonHighlight {
  metricId: GraphComparisonMetricId;
  label: string;
  summary: string;
}

export interface GraphComparison {
  primary: GraphComparisonSubject;
  secondary: GraphComparisonSubject;
  samePrompt: boolean;
  metrics: GraphComparisonMetric[];
  typeDeltas: GraphTypeDelta[];
  highlights: GraphComparisonHighlight[];
}

const NODE_TYPES: ReasoningNodeType[] = [
  'hypothesis',
  'analysis',
  'question',
  'evidence',
  'comparison',
  'revision',
  'decision',
  'conclusion',
];

const TYPE_LABELS: Record<ReasoningNodeType, string> = {
  hypothesis: 'Hypothesis',
  analysis: 'Analysis',
  question: 'Question',
  evidence: 'Evidence',
  comparison: 'Comparison',
  revision: 'Revision',
  decision: 'Decision',
  conclusion: 'Conclusion',
};

export function compareGraphs(primary: ReasoningGraph, secondary: ReasoningGraph): GraphComparison {
  const primaryNodes = flattenGraph(primary.rootNode);
  const secondaryNodes = flattenGraph(secondary.rootNode);

  const metrics: GraphComparisonMetric[] = [
    metric('nodes', 'Nodes', primaryNodes.length, secondaryNodes.length),
    metric('depth', 'Max depth', primary.metadata.maxDepth, secondary.metadata.maxDepth),
    metric('branches', 'Branches', primary.metadata.branchCount, secondary.metadata.branchCount),
    metric('tokens', 'Total tokens', primary.metadata.totalTokens, secondary.metadata.totalTokens),
    metric(
      'avg_confidence',
      'Avg confidence',
      averageConfidence(primaryNodes),
      averageConfidence(secondaryNodes)
    ),
  ];

  return {
    primary: graphSubject(primary),
    secondary: graphSubject(secondary),
    samePrompt: normalizePrompt(primary.prompt) === normalizePrompt(secondary.prompt),
    metrics,
    typeDeltas: typeDeltas(primaryNodes, secondaryNodes),
    highlights: buildHighlights(primary, secondary, metrics),
  };
}

function graphSubject(graph: ReasoningGraph): GraphComparisonSubject {
  return {
    id: graph.id,
    prompt: graph.prompt,
    modelLabel: graph.model.displayName,
  };
}

function metric(
  id: GraphComparisonMetricId,
  label: string,
  primaryValue: number | null,
  secondaryValue: number | null
): GraphComparisonMetric {
  return {
    id,
    label,
    primaryValue,
    secondaryValue,
    delta:
      primaryValue === null || secondaryValue === null
        ? null
        : roundNumber(primaryValue - secondaryValue),
  };
}

function typeDeltas(primaryNodes: ReasoningNode[], secondaryNodes: ReasoningNode[]): GraphTypeDelta[] {
  const primaryCounts = countTypes(primaryNodes);
  const secondaryCounts = countTypes(secondaryNodes);

  return NODE_TYPES.map((type) => {
    const primaryCount = primaryCounts.get(type) ?? 0;
    const secondaryCount = secondaryCounts.get(type) ?? 0;
    return {
      type,
      label: TYPE_LABELS[type],
      primaryCount,
      secondaryCount,
      delta: primaryCount - secondaryCount,
    };
  });
}

function countTypes(nodes: ReasoningNode[]): Map<ReasoningNodeType, number> {
  const counts = new Map<ReasoningNodeType, number>();
  for (const node of nodes) {
    counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
  }
  return counts;
}

function buildHighlights(
  primary: ReasoningGraph,
  secondary: ReasoningGraph,
  metrics: GraphComparisonMetric[]
): GraphComparisonHighlight[] {
  return metrics
    .filter((item) => typeof item.delta === 'number' && item.delta !== 0)
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
    .map((item) => ({
      metricId: item.id,
      label: item.label,
      summary: describeMetricDelta(item, primary.model.displayName, secondary.model.displayName),
    }));
}

function describeMetricDelta(
  metricItem: GraphComparisonMetric,
  primaryLabel: string,
  secondaryLabel: string
): string {
  const delta = metricItem.delta ?? 0;
  const amount = Math.abs(delta);
  const primaryHigher = delta > 0;

  switch (metricItem.id) {
    case 'depth':
      return `${primaryLabel} is ${formatCount(amount, 'level')} ${
        primaryHigher ? 'deeper' : 'shallower'
      } than ${secondaryLabel}.`;
    case 'avg_confidence':
      return `${primaryLabel} has ${Math.round(amount * 100)}pp ${
        primaryHigher ? 'higher' : 'lower'
      } average confidence than ${secondaryLabel}.`;
    case 'tokens':
      return `${primaryLabel} uses ${formatAmount(amount)} ${
        primaryHigher ? 'more' : 'fewer'
      } ${metricNoun(metricItem.id)}${amount === 1 ? '' : 's'} than ${secondaryLabel}.`;
    default:
      return `${primaryLabel} has ${formatAmount(amount)} ${
        primaryHigher ? 'more' : 'fewer'
      } ${metricNoun(metricItem.id)}${amount === 1 ? '' : 's'} than ${secondaryLabel}.`;
  }
}

function metricNoun(id: GraphComparisonMetricId): string {
  switch (id) {
    case 'tokens':
      return 'total token';
    case 'branches':
      return 'branch';
    case 'nodes':
      return 'node';
    case 'depth':
      return 'level';
    case 'avg_confidence':
      return 'confidence point';
  }
}

function formatCount(value: number, noun: string): string {
  return `${formatAmount(value)} ${noun}${value === 1 ? '' : 's'}`;
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : String(roundNumber(value));
}

function averageConfidence(nodes: ReasoningNode[]): number | null {
  const values = nodes
    .map((node) => node.confidence)
    .filter((value): value is number => typeof value === 'number');
  if (values.length === 0) return null;
  return roundNumber(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ');
}

function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}
