import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';
import {
  collectGraphEdges,
  flattenGraph as flattenReasoningGraph,
  type GraphEdge,
} from '@/core/graph/traversal';

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

const releaseDecision = node(
  'release-6',
  'decision',
  'Pause rollout and run rollback',
  'The safest decision is to pause the rollout, route traffic back to the stable build, and keep the failing build available only for isolated diagnostics.',
  3,
  [],
  5400,
  0.9
);

const releaseRevision = node(
  'release-5',
  'revision',
  'Do not keep retrying the same build',
  'Retrying the deploy without changing inputs would only add noise. The health checks already show a consistent failure pattern, so the next action should reduce blast radius.',
  3,
  [releaseDecision],
  4300,
  0.78
);

const releaseComparison = node(
  'release-4',
  'comparison',
  'Rollback vs. hotfix in place',
  'A hotfix in place is faster if the cause is obvious, but the logs show multiple failing probes. Rollback is slower to investigate later, but it restores service confidence now.',
  2,
  [releaseRevision],
  3300,
  0.84
);

const releaseEvidence = node(
  'release-3',
  'evidence',
  'Health checks fail after warmup',
  'The first readiness probe passes, then downstream dependency checks fail after warmup. Error rates rise only on the new build, not on the stable pool.',
  2,
  [],
  2400,
  0.82
);

const releaseAnalysis = node(
  'release-2',
  'analysis',
  'Separate deploy risk from diagnosis',
  'The deploy question has two jobs: protect users and preserve enough evidence for a later root-cause pass. Those jobs should not be coupled to a risky live retry.',
  1,
  [releaseEvidence, releaseComparison],
  1200,
  0.72
);

const releaseHypothesis = node(
  'release-1',
  'hypothesis',
  'Treat this as a rollout containment problem',
  'The production issue is less about finding the exact bug immediately and more about choosing the lowest-risk operational move while evidence is still fresh.',
  0,
  [releaseAnalysis],
  300,
  0.68
);

export const DEMO_RELEASE_GRAPH: ReasoningGraph = {
  id: 'demo-release-triage',
  prompt:
    'A production deploy is failing health checks after warmup. Should the team retry, hotfix in place, or roll back while preserving evidence?',
  model: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4 (demo)',
  },
  rootNode: releaseHypothesis,
  metadata: {
    totalTokens: 980,
    reasoningTokens: 820,
    outputTokens: 160,
    maxDepth: 3,
    branchCount: 2,
    nodeCount: 6,
    timeToComplete: 5400,
  },
  createdAt: Date.now(),
};

const approvalDecision = node(
  'approval-6',
  'decision',
  'Draft the email but hold for approval',
  'The agent should prepare a concise draft and stop at the approval boundary. Sending it automatically would cross a user-facing action gate.',
  2,
  [],
  5100,
  0.93
);

const approvalRevision = node(
  'approval-5',
  'revision',
  'Do not treat low risk as no gate',
  'I initially leaned toward sending because the message is routine, but the recipient is external and the action changes customer state. That makes approval mandatory.',
  2,
  [approvalDecision],
  3900,
  0.81
);

const approvalComparison = node(
  'approval-4',
  'comparison',
  'Autonomy vs. control boundary',
  'Full autonomy is useful for internal notes, but customer-visible communication needs a human checkpoint. The draft can still reduce work without removing control.',
  1,
  [approvalRevision],
  2900,
  0.79
);

const approvalEvidence = node(
  'approval-3',
  'evidence',
  'External communication changes user trust',
  'Even a correct customer email can create commitment, tone, or timing problems. A reversible internal action and an external send should not share the same policy.',
  1,
  [],
  2100,
  0.86
);

const approvalAnalysis = node(
  'approval-2',
  'analysis',
  'Classify the action before optimizing',
  'The first decision is not wording. It is whether this action is internal preparation or external execution. Only the second category requires the approval gate.',
  1,
  [approvalEvidence, approvalComparison],
  1000,
  0.74
);

const approvalQuestion = node(
  'approval-1',
  'question',
  'Can the agent send a customer email?',
  'The agent has enough context to draft a useful answer, but the send action touches an external customer. I need to separate drafting from committing.',
  0,
  [approvalAnalysis],
  300,
  0.66
);

export const DEMO_APPROVAL_GRAPH: ReasoningGraph = {
  id: 'demo-agent-approval',
  prompt:
    'An AI agent found the answer to a customer request. Should it send the customer email automatically or draft it for approval?',
  model: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4 (demo)',
  },
  rootNode: approvalQuestion,
  metadata: {
    totalTokens: 900,
    reasoningTokens: 760,
    outputTokens: 140,
    maxDepth: 2,
    branchCount: 2,
    nodeCount: 6,
    timeToComplete: 5100,
  },
  createdAt: Date.now(),
};

const dashboardDecision = node(
  'dashboard-7',
  'decision',
  'Build a redacted operator dashboard first',
  'The right first slice is a redacted operator dashboard: service health, snapshot freshness, queue status, and policy events. Raw private payload inspection should stay out of scope.',
  4,
  [],
  6500,
  0.91
);

const dashboardConclusion = node(
  'dashboard-6',
  'conclusion',
  'Use boundaries as the product shape',
  'The dashboard should make boundaries visible: what is live, what is redacted, what is stale, and which adapter is disconnected. That makes the system legible without overexposing it.',
  3,
  [dashboardDecision],
  5600,
  0.87
);

const dashboardComparison = node(
  'dashboard-5',
  'comparison',
  'Raw logs vs. summarized events',
  'Raw logs are complete but noisy and risky. Summarized events lose some detail, but they are safer to expose and easier to scan during operations.',
  2,
  [dashboardConclusion],
  4200,
  0.83
);

const dashboardEvidence = node(
  'dashboard-4',
  'evidence',
  'Operators need freshness and boundaries',
  'The most actionable status is whether snapshots are fresh, services are reachable, and adapters are connected. Those facts do not require private content.',
  2,
  [],
  3100,
  0.8
);

const dashboardQuestion = node(
  'dashboard-3',
  'question',
  'What should be visible without exposing internals?',
  'The dashboard should answer whether the node is healthy and what it did, but it should not imply access to private reasoning or raw user data.',
  2,
  [],
  2200,
  0.69
);

const dashboardAnalysis = node(
  'dashboard-2',
  'analysis',
  'Separate observability from disclosure',
  'Local-first observability should show control-plane facts, policy gates, and redacted outcomes. Disclosure of private payloads is a different product decision.',
  1,
  [dashboardQuestion, dashboardEvidence, dashboardComparison],
  1100,
  0.76
);

const dashboardHypothesis = node(
  'dashboard-1',
  'hypothesis',
  'Start with operational truth',
  'A local AI node dashboard should begin with operational truth: what is running, what is stale, what changed, and which actions crossed a policy gate.',
  0,
  [dashboardAnalysis],
  300,
  0.7
);

export const DEMO_DASHBOARD_GRAPH: ReasoningGraph = {
  id: 'demo-node-dashboard',
  prompt:
    'Design the first useful local AI node dashboard without exposing private payloads or pretending to show live model thoughts.',
  model: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4 (demo)',
  },
  rootNode: dashboardHypothesis,
  metadata: {
    totalTokens: 1160,
    reasoningTokens: 960,
    outputTokens: 200,
    maxDepth: 4,
    branchCount: 3,
    nodeCount: 7,
    timeToComplete: 6500,
  },
  createdAt: Date.now(),
};

const reviewDecision = node(
  'review-7',
  'decision',
  'Ship with an evidence checklist',
  'The answer should ship only after it cites the measurement source, names the uncertainty, and keeps the recommendation bounded to the observed system state.',
  3,
  [],
  6100,
  0.88
);

const reviewRevision = node(
  'review-6',
  'revision',
  'Tighten the claim before publishing',
  'The first draft sounded too broad. I should narrow it from "the system is healthy" to "the checked service and redacted markers are healthy at this timestamp."',
  3,
  [reviewDecision],
  5000,
  0.78
);

const reviewQuestion = node(
  'review-5',
  'question',
  'What could make this answer misleading?',
  'A stale marker, missing source timestamp, or hidden failing subsystem could make a confident answer misleading. The response needs to expose those limits.',
  2,
  [],
  4100,
  0.7
);

const reviewComparison = node(
  'review-4',
  'comparison',
  'Concise answer vs. auditable answer',
  'A concise answer is easier to read, but an auditable answer is safer for operations. The final response should be short while still naming evidence and limits.',
  2,
  [reviewRevision],
  3200,
  0.82
);

const reviewEvidence = node(
  'review-3',
  'evidence',
  'Evidence comes from redacted markers',
  'The available evidence is the deploy marker, HTTP status, canary status, and live-adapter status. None of these exposes raw prompts, credentials, or private payloads.',
  2,
  [],
  2300,
  0.84
);

const reviewAnalysis = node(
  'review-2',
  'analysis',
  'Apply review rules to the answer',
  'The review should test three rules: cite evidence, state uncertainty, and avoid overclaiming live telemetry. Passing all three makes the answer safer to share.',
  1,
  [reviewEvidence, reviewComparison, reviewQuestion],
  1100,
  0.74
);

const reviewHypothesis = node(
  'review-1',
  'hypothesis',
  'Treat answer review as rule testing',
  'Before publishing an operational answer, I should evaluate whether the reasoning has evidence, a decision, and an uncertainty probe rather than only a confident conclusion.',
  0,
  [reviewAnalysis],
  300,
  0.68
);

export const DEMO_ANSWER_REVIEW_GRAPH: ReasoningGraph = {
  id: 'demo-answer-review',
  prompt:
    'Review an AI-generated operations answer before sharing it: does it cite evidence, state uncertainty, and avoid overclaiming live telemetry?',
  model: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4 (demo)',
  },
  rootNode: reviewHypothesis,
  metadata: {
    totalTokens: 1100,
    reasoningTokens: 930,
    outputTokens: 170,
    maxDepth: 3,
    branchCount: 3,
    nodeCount: 7,
    timeToComplete: 6100,
  },
  createdAt: Date.now(),
};

export const DEMO_REASONING_GRAPHS = [
  DEMO_GRAPH,
  DEMO_RELEASE_GRAPH,
  DEMO_APPROVAL_GRAPH,
  DEMO_DASHBOARD_GRAPH,
  DEMO_ANSWER_REVIEW_GRAPH,
];

export interface DemoReasoningPrompt {
  id: string;
  title: string;
  subtitle: string;
  graph: ReasoningGraph;
}

export const DEMO_REASONING_PROMPTS: DemoReasoningPrompt[] = [
  {
    id: DEMO_GRAPH.id,
    title: 'River crossing',
    subtitle: 'Puzzle reasoning',
    graph: DEMO_GRAPH,
  },
  {
    id: DEMO_RELEASE_GRAPH.id,
    title: 'Release triage',
    subtitle: 'Rollback decision',
    graph: DEMO_RELEASE_GRAPH,
  },
  {
    id: DEMO_APPROVAL_GRAPH.id,
    title: 'Agent approval',
    subtitle: 'Policy boundary',
    graph: DEMO_APPROVAL_GRAPH,
  },
  {
    id: DEMO_DASHBOARD_GRAPH.id,
    title: 'Node dashboard',
    subtitle: 'Observable AI node',
    graph: DEMO_DASHBOARD_GRAPH,
  },
  {
    id: DEMO_ANSWER_REVIEW_GRAPH.id,
    title: 'Answer review',
    subtitle: 'Constitution check',
    graph: DEMO_ANSWER_REVIEW_GRAPH,
  },
];

export type GraphEdgeTuple = GraphEdge;
export const flattenGraph = flattenReasoningGraph;
export const collectEdges = collectGraphEdges;
