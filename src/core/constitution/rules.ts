import { flattenGraph } from '@/core/graph/traversal';
import type { ModelProvider, ReasoningGraph, ReasoningNodeType } from '@/core/parser/types';

export type ConstitutionRuleKind =
  | 'requires_node_type'
  | 'requires_text'
  | 'min_confidence'
  | 'max_depth';

export interface ConstitutionRule {
  id: string;
  label: string;
  kind: ConstitutionRuleKind;
  enabled: boolean;
  nodeType?: ReasoningNodeType;
  text?: string;
  minConfidence?: number;
  maxDepth?: number;
  provider?: ModelProvider;
}

export interface ConstitutionRuleInput {
  id?: string;
  label: string;
  kind: ConstitutionRuleKind;
  enabled?: boolean;
  nodeType?: ReasoningNodeType;
  text?: string;
  minConfidence?: number;
  maxDepth?: number;
}

export interface ConstitutionRuleResult {
  ruleId: string;
  label: string;
  kind: ConstitutionRuleKind;
  status: 'passed' | 'failed';
  message: string;
  nodeIds: string[];
}

export interface ConstitutionReport {
  graphId: string;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  score: number;
  results: ConstitutionRuleResult[];
}

export const DEFAULT_CONSTITUTION_RULES: ConstitutionRule[] = [
  {
    id: 'requires_evidence',
    label: 'Evidence required',
    kind: 'requires_node_type',
    enabled: true,
    nodeType: 'evidence',
  },
  {
    id: 'requires_decision',
    label: 'Decision required',
    kind: 'requires_node_type',
    enabled: true,
    nodeType: 'decision',
  },
  {
    id: 'requires_uncertainty_probe',
    label: 'Uncertainty probe required',
    kind: 'requires_node_type',
    enabled: true,
    nodeType: 'question',
  },
  {
    id: 'confidence_floor',
    label: 'Confidence floor',
    kind: 'min_confidence',
    enabled: true,
    minConfidence: 0.55,
  },
];

export function createConstitutionRule(input: ConstitutionRuleInput): ConstitutionRule {
  const label = input.label.trim();
  if (!label) throw new Error('Constitution rule label is required.');

  const base = {
    id: input.id ?? `constitution-${slugify(label)}-${input.kind}`,
    label,
    kind: input.kind,
    enabled: input.enabled ?? true,
  };

  if (input.kind === 'requires_node_type') {
    if (!input.nodeType) throw new Error('Constitution node-type rule requires a node type.');
    return { ...base, nodeType: input.nodeType };
  }

  if (input.kind === 'requires_text') {
    const text = input.text?.trim();
    if (!text) throw new Error('Constitution text rule requires a phrase.');
    return { ...base, text };
  }

  if (input.kind === 'min_confidence') {
    if (input.minConfidence == null || input.minConfidence <= 0 || input.minConfidence > 1) {
      throw new Error('Constitution confidence rule requires a value between 0 and 1.');
    }
    return { ...base, minConfidence: input.minConfidence };
  }

  if (input.maxDepth == null || input.maxDepth < 1) {
    throw new Error('Constitution max-depth rule requires a positive depth.');
  }
  return { ...base, maxDepth: Math.floor(input.maxDepth) };
}

export function evaluateConstitution(
  graph: ReasoningGraph,
  rules: ConstitutionRule[]
): ConstitutionReport {
  const activeRules = rules.filter((rule) => rule.enabled);
  const results = activeRules.map((rule) => evaluateRule(graph, rule));
  const passedRules = results.filter((result) => result.status === 'passed').length;
  const failedRules = results.length - passedRules;

  return {
    graphId: graph.id,
    totalRules: results.length,
    passedRules,
    failedRules,
    score: results.length === 0 ? 1 : passedRules / results.length,
    results,
  };
}

function evaluateRule(graph: ReasoningGraph, rule: ConstitutionRule): ConstitutionRuleResult {
  if (rule.kind === 'requires_node_type') return evaluateNodeTypeRule(graph, rule);
  if (rule.kind === 'requires_text') return evaluateTextRule(graph, rule);
  if (rule.kind === 'min_confidence') return evaluateConfidenceRule(graph, rule);
  return evaluateDepthRule(graph, rule);
}

function evaluateNodeTypeRule(
  graph: ReasoningGraph,
  rule: ConstitutionRule
): ConstitutionRuleResult {
  const nodeType = rule.nodeType ?? 'analysis';
  const nodes = flattenGraph(graph.rootNode).filter((node) => node.type === nodeType);
  const passed = nodes.length > 0;
  return {
    ruleId: rule.id,
    label: rule.label,
    kind: rule.kind,
    status: passed ? 'passed' : 'failed',
    message: passed
      ? `${nodes.length} ${nodeType} node${nodes.length === 1 ? '' : 's'} found.`
      : `No ${nodeType} node found.`,
    nodeIds: nodes.map((node) => node.id),
  };
}

function evaluateTextRule(graph: ReasoningGraph, rule: ConstitutionRule): ConstitutionRuleResult {
  const phrase = (rule.text ?? '').toLowerCase();
  const nodes = flattenGraph(graph.rootNode).filter((node) =>
    [node.summary, node.content].some((text) => text.toLowerCase().includes(phrase))
  );
  const promptMatches = graph.prompt.toLowerCase().includes(phrase);
  const passed = nodes.length > 0 || promptMatches;
  return {
    ruleId: rule.id,
    label: rule.label,
    kind: rule.kind,
    status: passed ? 'passed' : 'failed',
    message: passed ? `Phrase "${rule.text}" found.` : `Phrase "${rule.text}" not found.`,
    nodeIds: nodes.map((node) => node.id),
  };
}

function evaluateConfidenceRule(
  graph: ReasoningGraph,
  rule: ConstitutionRule
): ConstitutionRuleResult {
  const nodes = flattenGraph(graph.rootNode).filter((node) => typeof node.confidence === 'number');
  const minConfidence = rule.minConfidence ?? 0;

  if (nodes.length === 0) {
    return {
      ruleId: rule.id,
      label: rule.label,
      kind: rule.kind,
      status: 'failed',
      message: 'No confidence values found.',
      nodeIds: [],
    };
  }

  const average = nodes.reduce((sum, node) => sum + (node.confidence ?? 0), 0) / nodes.length;
  const lowNodes = nodes.filter((node) => (node.confidence ?? 0) < minConfidence);
  const passed = average >= minConfidence;

  return {
    ruleId: rule.id,
    label: rule.label,
    kind: rule.kind,
    status: passed ? 'passed' : 'failed',
    message: passed
      ? `Average confidence ${formatPercent(average)} meets required ${formatPercent(minConfidence)}.`
      : `Average confidence ${formatPercent(average)} is below required ${formatPercent(minConfidence)}.`,
    nodeIds: lowNodes.map((node) => node.id),
  };
}

function evaluateDepthRule(graph: ReasoningGraph, rule: ConstitutionRule): ConstitutionRuleResult {
  const maxDepth = rule.maxDepth ?? 1;
  const passed = graph.metadata.maxDepth <= maxDepth;
  return {
    ruleId: rule.id,
    label: rule.label,
    kind: rule.kind,
    status: passed ? 'passed' : 'failed',
    message: passed
      ? `Graph depth ${graph.metadata.maxDepth} is within limit ${maxDepth}.`
      : `Graph depth ${graph.metadata.maxDepth} exceeds limit ${maxDepth}.`,
    nodeIds: [],
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'rule';
}
