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
  label?: string;
  content: string;
  summary: string;
  children: ReasoningNode[];
  depth: number;
  tokenCount: number;
  confidence?: number;
  timestamp: number;
  metadata?: Record<string, string>;
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

export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'ollama' | 'custom-openai';

export interface ModelIdentifier {
  provider: ModelProvider;
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
