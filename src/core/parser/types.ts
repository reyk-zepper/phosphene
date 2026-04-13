export type ReasoningNodeType =
  | 'hypothesis'
  | 'analysis'
  | 'conclusion'
  | 'question'
  | 'comparison'
  | 'evidence'
  | 'revision'
  | 'decision';

export interface ReasoningNode {
  id: string;
  type: ReasoningNodeType;
  content: string;
  summary: string;
  children: ReasoningNode[];
  depth: number;
  tokenCount: number;
  confidence?: number;
  timestamp: number;
}

export interface GraphMetadata {
  totalTokens: number;
  reasoningTokens: number;
  outputTokens: number;
  maxDepth: number;
  branchCount: number;
  nodeCount: number;
  timeToComplete: number;
}

export interface ModelIdentifier {
  provider: 'anthropic' | 'openai' | 'google' | 'ollama';
  model: string;
  displayName: string;
}

export interface ReasoningGraph {
  id: string;
  prompt: string;
  model: ModelIdentifier;
  rootNode: ReasoningNode;
  metadata: GraphMetadata;
  createdAt: number;
}
