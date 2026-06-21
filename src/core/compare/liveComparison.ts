import type { LLMAdapter } from '@/core/adapters';
import { buildGraph, newGraphId } from '@/core/graph/builder';
import type { ModelIdentifier, ReasoningGraph } from '@/core/parser/types';

export interface LiveComparisonInput {
  prompt: string;
  model: ModelIdentifier;
  adapter: LLMAdapter;
  apiKey?: string;
  graphId?: string;
  now?: number;
  signal?: AbortSignal;
}

export async function runLiveComparison(input: LiveComparisonInput): Promise<ReasoningGraph> {
  const { prompt, model, adapter, signal } = input;
  const graphId = input.graphId ?? newGraphId();
  const startTime = input.now ?? Date.now();

  if (adapter.requiresApiKey && !input.apiKey) {
    throw new Error(`No API key configured for ${model.displayName}.`);
  }

  let thinkingBuffer = '';
  let outputBuffer = '';

  const stream = adapter.sendPrompt({
    prompt,
    model: model.model,
    apiKey: input.apiKey,
    signal,
  });

  for await (const chunk of stream) {
    if (signal?.aborted) throw new DOMException('Comparison cancelled.', 'AbortError');
    if (chunk.type === 'thinking') {
      thinkingBuffer += chunk.content;
    } else if (chunk.type === 'text') {
      outputBuffer += chunk.content;
    } else if (chunk.type === 'error') {
      throw new Error(chunk.content);
    } else if (chunk.type === 'done') {
      break;
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Comparison cancelled.', 'AbortError');
  }

  const graph = buildGraph({
    id: graphId,
    prompt,
    model,
    thinkingBuffer,
    outputBuffer,
    startTime,
  });

  if (!graph) {
    throw new Error('Comparison model returned no graphable content.');
  }

  return graph;
}
