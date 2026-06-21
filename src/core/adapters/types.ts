import type { ModelIdentifier, ModelProvider } from '@/core/parser/types';

export type ProviderId = ModelProvider | 'demo';

export interface PromptParams {
  prompt: string;
  model: string;
  apiKey?: string;
  endpointUrl?: string;
  maxTokens?: number;
  thinkingBudget?: number;
  signal?: AbortSignal;
}

export type ReasoningChunk =
  | { type: 'thinking'; content: string; timestamp: number }
  | { type: 'text'; content: string; timestamp: number }
  | { type: 'error'; content: string; timestamp: number }
  | { type: 'done'; content: ''; timestamp: number };

export interface LLMAdapter {
  id: ProviderId;
  name: string;
  requiresApiKey: boolean;
  supportedModels: ModelIdentifier[];
  sendPrompt(params: PromptParams): AsyncGenerator<ReasoningChunk>;
  validateKey?(key: string): Promise<boolean>;
}
