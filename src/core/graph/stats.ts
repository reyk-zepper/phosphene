import type { ReasoningGraph, ReasoningNode, ReasoningNodeType } from '../parser/types';

export type ConfidenceBandId = 'high' | 'medium' | 'low' | 'unknown';

export interface GraphStatsOverview {
  totalTokens: number;
  reasoningTokens: number;
  outputTokens: number;
  nodeCount: number;
  maxDepth: number;
  branchCount: number;
  timeToComplete: number;
  averageConfidence: number | null;
  confidenceCoverage: number;
}

export interface GraphConfidenceBand {
  id: ConfidenceBandId;
  label: string;
  nodeCount: number;
  percentage: number;
}

export interface GraphDepthBucket {
  depth: number;
  nodeCount: number;
  tokenCount: number;
  percentageOfTokens: number;
}

export interface GraphTypeBreakdown {
  type: ReasoningNodeType;
  label: string;
  nodeCount: number;
  tokenCount: number;
  percentageOfNodes: number;
  percentageOfTokens: number;
}

export interface GraphTokenHotspot {
  id: string;
  type: ReasoningNodeType;
  summary: string;
  tokenCount: number;
  percentageOfGraphTokens: number;
}

export interface GraphStatsSummary {
  overview: GraphStatsOverview;
  confidenceBands: GraphConfidenceBand[];
  depthDistribution: GraphDepthBucket[];
  typeBreakdown: GraphTypeBreakdown[];
  tokenHotspots: GraphTokenHotspot[];
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

const CONFIDENCE_BANDS: Array<{ id: ConfidenceBandId; label: string }> = [
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
  { id: 'unknown', label: 'Unknown' },
];

interface NodeVisit {
  node: ReasoningNode;
  depth: number;
}

export function summarizeGraphStats(graph: ReasoningGraph): GraphStatsSummary {
  const visits = flattenGraphWithDepth(graph.rootNode);
  const nodeTokenTotal = visits.reduce((sum, visit) => sum + visit.node.tokenCount, 0);
  const confidenceValues = visits
    .map((visit) => visit.node.confidence)
    .filter((value): value is number => typeof value === 'number');

  return {
    overview: {
      totalTokens: graph.metadata.totalTokens,
      reasoningTokens: graph.metadata.reasoningTokens,
      outputTokens: graph.metadata.outputTokens,
      nodeCount: visits.length,
      maxDepth: Math.max(0, ...visits.map((visit) => visit.depth)),
      branchCount: visits.reduce((sum, visit) => sum + visit.node.children.length, 0),
      timeToComplete: graph.metadata.timeToComplete,
      averageConfidence:
        confidenceValues.length === 0
          ? null
          : roundNumber(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length),
      confidenceCoverage: ratio(confidenceValues.length, visits.length),
    },
    confidenceBands: buildConfidenceBands(visits),
    depthDistribution: buildDepthDistribution(visits, nodeTokenTotal),
    typeBreakdown: buildTypeBreakdown(visits, nodeTokenTotal),
    tokenHotspots: visits
      .map((visit) => ({
        id: visit.node.id,
        type: visit.node.type,
        summary: visit.node.summary,
        tokenCount: visit.node.tokenCount,
        percentageOfGraphTokens: ratio(visit.node.tokenCount, nodeTokenTotal),
      }))
      .sort((a, b) => b.tokenCount - a.tokenCount || a.id.localeCompare(b.id)),
  };
}

function buildConfidenceBands(visits: NodeVisit[]): GraphConfidenceBand[] {
  const counts = new Map<ConfidenceBandId, number>();
  for (const visit of visits) {
    const band = confidenceBand(visit.node.confidence);
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }

  return CONFIDENCE_BANDS.map((band) => ({
    id: band.id,
    label: band.label,
    nodeCount: counts.get(band.id) ?? 0,
    percentage: ratio(counts.get(band.id) ?? 0, visits.length),
  }));
}

function buildDepthDistribution(visits: NodeVisit[], nodeTokenTotal: number): GraphDepthBucket[] {
  const buckets = new Map<number, { nodeCount: number; tokenCount: number }>();
  for (const visit of visits) {
    const current = buckets.get(visit.depth) ?? { nodeCount: 0, tokenCount: 0 };
    current.nodeCount += 1;
    current.tokenCount += visit.node.tokenCount;
    buckets.set(visit.depth, current);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([depth, bucket]) => ({
      depth,
      nodeCount: bucket.nodeCount,
      tokenCount: bucket.tokenCount,
      percentageOfTokens: ratio(bucket.tokenCount, nodeTokenTotal),
    }));
}

function buildTypeBreakdown(visits: NodeVisit[], nodeTokenTotal: number): GraphTypeBreakdown[] {
  const buckets = new Map<ReasoningNodeType, { nodeCount: number; tokenCount: number }>();
  for (const visit of visits) {
    const current = buckets.get(visit.node.type) ?? { nodeCount: 0, tokenCount: 0 };
    current.nodeCount += 1;
    current.tokenCount += visit.node.tokenCount;
    buckets.set(visit.node.type, current);
  }

  return NODE_TYPES.flatMap((type) => {
    const bucket = buckets.get(type);
    if (!bucket) return [];
    return [{
      type,
      label: TYPE_LABELS[type],
      nodeCount: bucket.nodeCount,
      tokenCount: bucket.tokenCount,
      percentageOfNodes: ratio(bucket.nodeCount, visits.length),
      percentageOfTokens: ratio(bucket.tokenCount, nodeTokenTotal),
    }];
  });
}

function confidenceBand(confidence: number | undefined): ConfidenceBandId {
  if (typeof confidence !== 'number') return 'unknown';
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.65) return 'medium';
  return 'low';
}

function flattenGraphWithDepth(root: ReasoningNode): NodeVisit[] {
  const visits: NodeVisit[] = [];
  const walk = (node: ReasoningNode, depth: number) => {
    visits.push({ node, depth });
    node.children.forEach((child) => walk(child, depth + 1));
  };
  walk(root, 0);
  return visits;
}

function ratio(value: number, total: number): number {
  if (total <= 0) return 0;
  return roundNumber(value / total);
}

function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}
