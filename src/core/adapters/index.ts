import type { LLMAdapter, ProviderId } from './types';
import { claudeAdapter } from './claude';
import { openaiAdapter } from './openai';
import { ollamaAdapter } from './ollama';

export type { LLMAdapter, PromptParams, ReasoningChunk, ProviderId } from './types';
export { probeOllama, ollamaBaseUrl } from './ollama';
export type { OllamaReachability, OllamaModelSummary } from './ollama';

export const ADAPTERS: Record<ProviderId, LLMAdapter | null> = {
  anthropic: claudeAdapter,
  openai: openaiAdapter,
  google: null,
  ollama: ollamaAdapter,
  demo: null,
};

export function getAdapter(id: ProviderId): LLMAdapter | null {
  return ADAPTERS[id];
}
