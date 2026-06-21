import type { ModelIdentifier } from '@/core/parser/types';
import type { LLMAdapter, PromptParams, ReasoningChunk } from './types';

const API_URL = 'https://api.openai.com/v1/responses';

const SUPPORTED_MODELS: ModelIdentifier[] = [
  {
    provider: 'openai',
    model: 'o3',
    displayName: 'OpenAI o3',
  },
  {
    provider: 'openai',
    model: 'o4-mini',
    displayName: 'OpenAI o4-mini',
  },
  {
    provider: 'openai',
    model: 'gpt-5.2',
    displayName: 'GPT-5.2',
  },
];

interface SSEEvent {
  event: string;
  data: unknown;
}

type ResponsesPayload = {
  type?: string;
  delta?: unknown;
  error?: { message?: string; code?: string };
  response?: { status?: string; error?: { message?: string; code?: string } | null };
};

function headers(apiKey: string): HeadersInit {
  return {
    authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
  };
}

async function* parseSSEEvents(
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

    const tail = buffer.trim();
    if (tail) {
      const evt = parseSSEChunk(tail);
      if (evt) yield evt;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSSEChunk(raw: string): SSEEvent | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
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

export async function* parseOpenAIResponsesStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<ReasoningChunk> {
  for await (const evt of parseSSEEvents(body, signal)) {
    const payload = evt.data as ResponsesPayload | null;
    const type = payload?.type ?? evt.event;
    if (!payload) continue;

    if (type === 'response.output_text.delta') {
      const text = readDeltaText(payload.delta);
      if (text) yield { type: 'text', content: text, timestamp: Date.now() };
      continue;
    }

    if (
      type === 'response.reasoning_summary_text.delta' ||
      type === 'response.reasoning_summary.delta' ||
      type === 'response.reasoning_text.delta'
    ) {
      const text = readDeltaText(payload.delta);
      if (text) yield { type: 'thinking', content: text, timestamp: Date.now() };
      continue;
    }

    if (type === 'response.completed') {
      yield { type: 'done', content: '', timestamp: Date.now() };
      return;
    }

    if (type === 'error' || type === 'response.error' || type === 'response.failed') {
      yield {
        type: 'error',
        content: readErrorMessage(payload),
        timestamp: Date.now(),
      };
      return;
    }
  }

  yield { type: 'done', content: '', timestamp: Date.now() };
}

function readDeltaText(delta: unknown): string {
  if (typeof delta === 'string') return delta;
  if (delta && typeof delta === 'object' && 'text' in delta) {
    const text = (delta as { text?: unknown }).text;
    return typeof text === 'string' ? text : '';
  }
  return '';
}

function readErrorMessage(payload: ResponsesPayload): string {
  return (
    payload.error?.message ??
    payload.response?.error?.message ??
    payload.error?.code ??
    payload.response?.error?.code ??
    'OpenAI stream error'
  );
}

function reasoningEffort(thinkingBudget?: number): 'low' | 'medium' | 'high' {
  if (thinkingBudget != null && thinkingBudget <= 4_000) return 'low';
  if (thinkingBudget != null && thinkingBudget >= 12_000) return 'high';
  return 'medium';
}

async function* sendPrompt(params: PromptParams): AsyncGenerator<ReasoningChunk> {
  const { prompt, model, apiKey, maxTokens = 16_000, thinkingBudget, signal } = params;
  if (!apiKey) {
    yield { type: 'error', content: 'Missing OpenAI API key', timestamp: Date.now() };
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
    response = await fetch(API_URL, {
      method: 'POST',
      headers: headers(apiKey),
      body,
      signal,
    });
  } catch (err) {
    yield {
      type: 'error',
      content: err instanceof Error ? err.message : 'Network error',
      timestamp: Date.now(),
    };
    return;
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => response.statusText);
    yield {
      type: 'error',
      content: `OpenAI API ${response.status}: ${text.slice(0, 500)}`,
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
      content: err instanceof Error ? err.message : 'OpenAI stream error',
      timestamp: Date.now(),
    };
  }
}

async function validateKey(key: string): Promise<boolean> {
  if (!key || !key.startsWith('sk-')) return false;
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: headers(key),
    });
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}

export const openaiAdapter: LLMAdapter = {
  id: 'openai',
  name: 'OpenAI',
  requiresApiKey: true,
  supportedModels: SUPPORTED_MODELS,
  sendPrompt,
  validateKey,
};
