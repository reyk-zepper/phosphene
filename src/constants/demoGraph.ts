import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';

const node = (
  id: string,
  type: ReasoningNode['type'],
  summary: string,
  content: string,
  depth: number,
  children: ReasoningNode[] = [],
  timestamp = 0,
  confidence?: number
): ReasoningNode => ({
  id,
  type,
  summary,
  content,
  children,
  depth,
  tokenCount: Math.ceil(content.length / 4),
  confidence,
  timestamp,
});

const leafConclusion = node(
  'n8',
  'decision',
  "Commit to the 7-trip solution",
  "I'll go with the solution: farmer takes goat, returns, takes wolf, brings goat back, takes cabbage, returns, takes goat. Seven trips total. No item is ever left alone with something that would eat it.",
  3,
  [],
  7200,
  0.95
);

const verifyStep = node(
  'n7',
  'conclusion',
  'The sequence works end-to-end',
  'Therefore, the 7-trip sequence keeps the wolf and goat apart, and the goat and cabbage apart, at every moment where the farmer is absent. The puzzle is solved.',
  2,
  [leafConclusion],
  6400,
  0.9
);

const revisionStep = node(
  'n6',
  'revision',
  'Wait — bring the goat back',
  "Wait, actually, I missed a step. If I take the wolf across second, I need to bring the goat back, otherwise the wolf and goat will be alone on the far side. Let me correct the sequence.",
  2,
  [verifyStep],
  5200,
  0.82
);

const comparisonStep = node(
  'n5',
  'comparison',
  'Take the goat first vs. take the wolf first',
  'Comparing options: taking the wolf first leaves the goat with the cabbage (bad). Taking the cabbage first leaves the wolf with the goat (bad). Taking the goat first is the only safe opening move.',
  1,
  [revisionStep],
  4100,
  0.88
);

const evidenceStep = node(
  'n4',
  'evidence',
  'Known constraints from the problem',
  'According to the problem: wolf eats goat if left alone together, goat eats cabbage if left alone together, boat carries farmer plus one item. The farmer himself is always safe.',
  1,
  [],
  3000
);

const questionStep = node(
  'n3',
  'question',
  'What if the farmer can bring items back?',
  "But what if the farmer can make return trips with an item he already moved? The problem doesn't forbid that — it only limits boat capacity. That opens up the solution space.",
  1,
  [],
  2100
);

const analysisStep = node(
  'n2',
  'analysis',
  'Break down the constraints',
  "Let me think about this carefully. There are three items and a capacity-1 boat. The constraint is which pairs can be left alone on either bank. Let me list the forbidden pairings.",
  1,
  [questionStep, evidenceStep, comparisonStep],
  1200
);

const hypothesisStep = node(
  'n1',
  'hypothesis',
  'Initial guess: move goat first',
  "My initial thought is that the goat is the common threat — both the wolf and the cabbage interact badly with it. So the goat probably needs to move first.",
  0,
  [analysisStep],
  400,
  0.7
);

export const DEMO_GRAPH: ReasoningGraph = {
  id: 'demo-river-crossing',
  prompt:
    'A farmer needs to cross a river with a wolf, a goat, and a cabbage. The boat can only carry the farmer and one item. If left alone, the wolf eats the goat, and the goat eats the cabbage. How does the farmer get everything across?',
  model: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4 (demo)',
  },
  rootNode: hypothesisStep,
  metadata: {
    totalTokens: 1420,
    reasoningTokens: 1180,
    outputTokens: 240,
    maxDepth: 3,
    branchCount: 3,
    nodeCount: 8,
    timeToComplete: 7200,
  },
  createdAt: Date.now(),
};

const alternateDecision = node(
  'o5',
  'decision',
  'Choose the return-trip sequence',
  'The working sequence is goat across, farmer returns, wolf across, goat returns, cabbage across, farmer returns, goat across. The key is using the goat as the item that moves back once.',
  2,
  [],
  4700,
  0.92
);

const alternateEvidence = node(
  'o4',
  'evidence',
  'Boat capacity forces return trips',
  'The boat carries the farmer plus one item. Because two unsafe pairings exist, at least one item must be brought back to reset the bank state.',
  2,
  [],
  3100,
  0.75
);

const alternateAnalysis = node(
  'o3',
  'analysis',
  'Enumerate unsafe bank states',
  'Leaving wolf with goat or goat with cabbage without the farmer fails. Therefore the first move should isolate the goat, then use return trips to avoid both forbidden pairings.',
  1,
  [alternateEvidence, alternateDecision],
  1600,
  0.7
);

const alternateHypothesis = node(
  'o1',
  'hypothesis',
  'Start by isolating the goat',
  'The goat appears in both constraints, so the safest opening is to move it first and keep both banks from containing a forbidden pair without the farmer.',
  0,
  [alternateAnalysis],
  300,
  0.6
);

export const DEMO_COMPARISON_GRAPH: ReasoningGraph = {
  id: 'demo-river-crossing-o3',
  prompt: DEMO_GRAPH.prompt,
  model: {
    provider: 'openai',
    model: 'o3-demo',
    displayName: 'OpenAI o3 demo',
  },
  rootNode: alternateHypothesis,
  metadata: {
    totalTokens: 820,
    reasoningTokens: 700,
    outputTokens: 120,
    maxDepth: 2,
    branchCount: 2,
    nodeCount: 4,
    timeToComplete: 3900,
  },
  createdAt: Date.now(),
};

export function flattenGraph(root: ReasoningNode): ReasoningNode[] {
  const out: ReasoningNode[] = [];
  const walk = (n: ReasoningNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  walk(root);
  return out;
}

export interface GraphEdgeTuple {
  from: string;
  to: string;
}

export function collectEdges(root: ReasoningNode): GraphEdgeTuple[] {
  const edges: GraphEdgeTuple[] = [];
  const walk = (n: ReasoningNode) => {
    for (const child of n.children) {
      edges.push({ from: n.id, to: child.id });
      walk(child);
    }
  };
  walk(root);
  return edges;
}
