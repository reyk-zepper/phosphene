import type { LLMAdapter, PromptParams, ReasoningChunk } from './types';
import { formatAdapterHttpError, sanitizeAdapterErrorText } from './errors';
import { parseOpenAIResponsesStream } from './openai';
import { CUSTOM_OPENAI_PROVIDER_ID, isSafeCustomResponsesUrl } from '@/core/settings/customApiProfiles';

function headers(apiKey?: string): HeadersInit {
  return {
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    'content-type': 'application/json',
  };
}

function reasoningEffort(thinkingBudget?: number): 'low' | 'medium' | 'high' {
  if (thinkingBudget != null && thinkingBudget <= 4_000) return 'low';
  if (thinkingBudget != null && thinkingBudget >= 12_000) return 'high';
  return 'medium';
}

async function* sendPrompt(params: PromptParams): AsyncGenerator<ReasoningChunk> {
  const { prompt, model, apiKey, endpointUrl, maxTokens = 16_000, thinkingBudget, signal } = params;
  if (!endpointUrl) {
    yield {
      type: 'error',
      content: 'Missing custom OpenAI-compatible Responses endpoint',
      timestamp: Date.now(),
    };
    return;
  }

  if (!isSafeCustomResponsesUrl(endpointUrl)) {
    yield {
      type: 'error',
      content: 'Custom API endpoint must use https or localhost http.',
      timestamp: Date.now(),
    };
    return;
  }

  const body = JSON.stringify({
    model,
    input: [{ role: 'user', content: prompt }],
    max_output_tokens: maxTokens,
    reasoning: {
      effort: reasoningEffort(thinkingBudget),
      summary: 'auto',
    },
    stream: true,
    store: false,
  });

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: 'POST',
      headers: headers(apiKey),
      body,
      signal,
    });
  } catch (err) {
    yield {
      type: 'error',
      content: err instanceof Error ? sanitizeAdapterErrorText(err.message) : 'Custom OpenAI network error',
      timestamp: Date.now(),
    };
    return;
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => response.statusText);
    yield {
      type: 'error',
      content: formatAdapterHttpError('Custom OpenAI API', response.status, text),
      timestamp: Date.now(),
    };
    return;
  }

  try {
    yield* parseOpenAIResponsesStream(response.body, signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    yield {
      type: 'error',
      content: err instanceof Error ? sanitizeAdapterErrorText(err.message) : 'Custom OpenAI stream error',
      timestamp: Date.now(),
    };
  }
}

export const customOpenAIAdapter: LLMAdapter = {
  id: CUSTOM_OPENAI_PROVIDER_ID,
  name: 'Custom OpenAI API',
  requiresApiKey: false,
  supportedModels: [],
  sendPrompt,
};
