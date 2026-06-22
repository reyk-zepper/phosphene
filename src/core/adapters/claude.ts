import type { ModelIdentifier } from '@/core/parser/types';
import { formatAdapterHttpError, sanitizeAdapterErrorText } from './errors';
import type { LLMAdapter, PromptParams, ReasoningChunk } from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

const SUPPORTED_MODELS: ModelIdentifier[] = [
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    displayName: 'Claude Sonnet 4.6',
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-4-6',
    displayName: 'Claude Opus 4.6',
  },
  {
    provider: 'anthropic',
    model: 'claude-haiku-4-5',
    displayName: 'Claude Haiku 4.5',
  },
];

function headers(apiKey: string): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': API_VERSION,
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

interface SSEEvent {
  event: string;
  data: unknown;
}

async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const evt = parseSSEChunk(raw);
        if (evt) yield evt;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSEChunk(raw: string): SSEEvent | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  const dataStr = dataLines.join('\n');
  if (dataStr === '[DONE]') return { event, data: null };
  try {
    return { event, data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}

type StreamPayload = {
  type?: string;
  delta?: { type?: string; thinking?: string; text?: string };
  message?: { usage?: { input_tokens: number; output_tokens: number } };
};

async function* sendPrompt(params: PromptParams): AsyncGenerator<ReasoningChunk> {
  const { prompt, model, apiKey, maxTokens = 16000, thinkingBudget = 10000, signal } = params;
  if (!apiKey) {
    yield { type: 'error', content: 'Missing Anthropic API key', timestamp: Date.now() };
    return;
  }

  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    thinking: {
      type: 'enabled',
      budget_tokens: thinkingBudget,
    },
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: headers(apiKey),
      body,
      signal,
    });
  } catch (err) {
    yield {
      type: 'error',
      content: err instanceof Error ? sanitizeAdapterErrorText(err.message) : 'Network error',
      timestamp: Date.now(),
    };
    return;
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => response.statusText);
    yield {
      type: 'error',
      content: formatAdapterHttpError('Claude API', response.status, text),
      timestamp: Date.now(),
    };
    return;
  }

  try {
    for await (const evt of parseSSEStream(response.body, signal)) {
      const payload = evt.data as StreamPayload | null;
      if (!payload) continue;
      if (payload.type === 'content_block_delta' && payload.delta) {
        if (payload.delta.type === 'thinking_delta' && payload.delta.thinking) {
          yield {
            type: 'thinking',
            content: payload.delta.thinking,
            timestamp: Date.now(),
          };
        } else if (payload.delta.type === 'text_delta' && payload.delta.text) {
          yield {
            type: 'text',
            content: payload.delta.text,
            timestamp: Date.now(),
          };
        }
      } else if (payload.type === 'message_stop') {
        yield { type: 'done', content: '', timestamp: Date.now() };
        return;
      }
    }
    yield { type: 'done', content: '', timestamp: Date.now() };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    yield {
      type: 'error',
      content: err instanceof Error ? sanitizeAdapterErrorText(err.message) : 'Stream error',
      timestamp: Date.now(),
    };
  }
}

async function validateKey(key: string): Promise<boolean> {
  if (!key || !key.startsWith('sk-ant-')) return false;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}

export const claudeAdapter: LLMAdapter = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  requiresApiKey: true,
  supportedModels: SUPPORTED_MODELS,
  sendPrompt,
  validateKey,
};
