import type { ReasoningNode, ReasoningNodeType } from '../parser/types';

export type GraphSearchField =
  | 'summary'
  | 'content'
  | 'type'
  | 'label'
  | 'metadata'
  | 'pattern'
  | 'confidence';

export interface GraphSearchResult {
  node: ReasoningNode;
  score: number;
  matchedFields: GraphSearchField[];
}

type ConfidenceFilter = 'low' | 'medium' | 'high';
type GraphSearchPattern = 'mind-change';

interface ParsedGraphSearchQuery {
  textTerms: string[];
  nodeTypes: ReasoningNodeType[];
  confidence?: ConfidenceFilter;
  patterns: GraphSearchPattern[];
}

const NODE_TYPES: ReasoningNodeType[] = [
  'hypothesis',
  'analysis',
  'conclusion',
  'question',
  'comparison',
  'evidence',
  'revision',
  'decision',
];

const STOP_WORDS = new Set([
  'alle',
  'all',
  'das',
  'der',
  'die',
  'find',
  'finde',
  'finding',
  'graph',
  'model',
  'modell',
  'node',
  'nodes',
  'search',
  'stellen',
  'the',
  'where',
  'wo',
]);

export function searchGraphNodes(root: ReasoningNode, query: string): GraphSearchResult[] {
  const parsed = parseGraphSearchQuery(query);
  const hasCriteria =
    parsed.textTerms.length > 0 ||
    parsed.nodeTypes.length > 0 ||
    parsed.patterns.length > 0 ||
    parsed.confidence != null;

  if (!hasCriteria) return [];

  return flattenNodes(root)
    .map(({ node, index }) => {
      const matchedFields = new Set<GraphSearchField>();
      let score = 0;

      if (parsed.nodeTypes.length > 0) {
        if (!parsed.nodeTypes.includes(node.type)) return null;
        matchedFields.add('type');
        score += 30;
      }

      if (parsed.confidence) {
        if (!matchesConfidence(node.confidence, parsed.confidence)) return null;
        matchedFields.add('confidence');
        score += Math.round((node.confidence ?? 0) * 100);
      }

      if (parsed.patterns.includes('mind-change')) {
        if (!isMindChangeNode(node)) return null;
        matchedFields.add('pattern');
        score += 50;
      }

      if (parsed.textTerms.length > 0) {
        const textMatches = matchTextTerms(node, parsed.textTerms);
        if (!textMatches) return null;
        textMatches.forEach((field) => matchedFields.add(field));
        score += parsed.textTerms.length * 10;
      }

      return {
        node,
        score,
        matchedFields: [...matchedFields],
        index,
      };
    })
    .filter((result): result is GraphSearchResult & { index: number } => result != null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((result) => ({
      node: result.node,
      score: result.score,
      matchedFields: result.matchedFields,
    }));
}

export function parseGraphSearchQuery(query: string): ParsedGraphSearchQuery {
  const normalizedQuery = normalize(query);
  const patterns: GraphSearchPattern[] = [];
  const nodeTypes: ReasoningNodeType[] = [];
  let confidence: ConfidenceFilter | undefined;
  const textTerms: string[] = [];

  if (isMindChangeQuery(normalizedQuery)) {
    patterns.push('mind-change');
  }

  const rawTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  for (const token of rawTokens) {
    const [key, rawValue] = token.split(':', 2);
    if (rawValue) {
      if (key === 'type' && isReasoningNodeType(rawValue)) {
        nodeTypes.push(rawValue);
        continue;
      }
      if (key === 'confidence' && isConfidenceFilter(rawValue)) {
        confidence = rawValue;
        continue;
      }
      if (key === 'pattern' && rawValue === 'mind-change') {
        if (!patterns.includes('mind-change')) patterns.push('mind-change');
        continue;
      }
    }

    if (patterns.includes('mind-change')) continue;
    if (STOP_WORDS.has(token) || token.length < 2) continue;
    textTerms.push(token);
  }

  return {
    textTerms,
    nodeTypes: [...new Set(nodeTypes)],
    confidence,
    patterns: [...new Set(patterns)],
  };
}

function flattenNodes(root: ReasoningNode): Array<{ node: ReasoningNode; index: number }> {
  const nodes: Array<{ node: ReasoningNode; index: number }> = [];
  const walk = (node: ReasoningNode) => {
    nodes.push({ node, index: nodes.length });
    node.children.forEach(walk);
  };
  walk(root);
  return nodes;
}

function matchTextTerms(node: ReasoningNode, terms: string[]): GraphSearchField[] | null {
  const fields: Array<[GraphSearchField, string]> = [
    ['summary', node.summary],
    ['content', node.content],
    ['type', node.type],
    ['label', node.label ?? ''],
    ['metadata', node.metadata ? Object.entries(node.metadata).flat().join(' ') : ''],
  ];

  const matchedFields = new Set<GraphSearchField>();
  const allTermsMatch = terms.every((term) => {
    const matches = fields.filter(([, value]) => normalize(value).includes(term));
    matches.forEach(([field]) => matchedFields.add(field));
    return matches.length > 0;
  });

  return allTermsMatch ? [...matchedFields] : null;
}

function isMindChangeNode(node: ReasoningNode): boolean {
  if (node.type === 'revision') return true;

  const text = normalize(`${node.summary} ${node.content}`);
  return (
    /\b(wait|actually|reconsider|correct|correction|missed|revise|revision|change mind|changed mind)\b/.test(text) ||
    /\b(revidiere|korrigiere|korrektur|ueberdenke|uberdenke|anders)\b/.test(text)
  );
}

function matchesConfidence(confidence: number | undefined, filter: ConfidenceFilter): boolean {
  if (confidence == null) return false;
  if (filter === 'high') return confidence >= 0.85;
  if (filter === 'medium') return confidence >= 0.5 && confidence < 0.85;
  return confidence < 0.5;
}

function isMindChangeQuery(query: string): boolean {
  return (
    query.includes('pattern:mind-change') ||
    /\b(mind change|mind changes|changes mind|changed mind|revision|reconsider)\b/.test(query) ||
    /\bmeinung\b.*\b(andert|aendert|geandert|geaendert|wechselt)\b/.test(query) ||
    /\b(revidiert|revidiere|korrigiert|korrigiere|ueberdenkt|uberdenkt)\b/.test(query)
  );
}

function isReasoningNodeType(value: string): value is ReasoningNodeType {
  return NODE_TYPES.includes(value as ReasoningNodeType);
}

function isConfidenceFilter(value: string): value is ConfidenceFilter {
  return value === 'low' || value === 'medium' || value === 'high';
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss');
}
