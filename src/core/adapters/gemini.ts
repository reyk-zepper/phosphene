import type { ModelIdentifier } from '@/core/parser/types';
import type { LLMAdapter, PromptParams, ReasoningChunk } from './types';

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const SUPPORTED_MODELS: ModelIdentifier[] = [
  {
    provider: 'google',
    model: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
  },
  {
    provider: 'google',
    model: 'gemini-3.1-pro',
    displayName: 'Gemini 3.1 Pro',
  },
  {
    provider: 'google',
    model: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
  },
];

interface SSEEvent {
  data: unknown;
}

type GeminiPart = {
  text?: string;
  thought?: boolean;
};

type GeminiPayload = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
};

function headers(apiKey: string): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-goog-api-key': apiKey,
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
  const dataLines: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }

  if (dataLines.length === 0) return null;
  const dataStr = dataLines.join('\n');
  if (dataStr === '[DONE]') return { data: null };

  try {
    return { data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}

export async function* parseGeminiStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<ReasoningChunk> {
  for await (const evt of parseSSEEvents(body, signal)) {
    const payload = evt.data as GeminiPayload | null;
    if (!payload) continue;

    if (payload.error) {
      yield {
        type: 'error',
        content: payload.error.message ?? payload.error.status ?? 'Gemini stream error',
        timestamp: Date.now(),
      };
      return;
    }

    for (const candidate of payload.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if (!part.text) continue;
        yield {
          type: part.thought ? 'thinking' : 'text',
          content: part.text,
          timestamp: Date.now(),
        };
      }
    }
  }

  yield { type: 'done', content: '', timestamp: Date.now() };
}

function thinkingLevel(thinkingBudget?: number): 'low' | 'medium' | 'high' {
  if (thinkingBudget != null && thinkingBudget <= 4_000) return 'low';
  if (thinkingBudget != null && thinkingBudget >= 12_000) return 'high';
  return 'medium';
}

function endpoint(model: string): string {
  return `${API_BASE_URL}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
}

async function* sendPrompt(params: PromptParams): AsyncGenerator<ReasoningChunk> {
  const { prompt, model, apiKey, maxTokens = 16_000, thinkingBudget, signal } = params;
  if (!apiKey) {
    yield { type: 'error', content: 'Missing Gemini API key', timestamp: Date.now() };
    return;
  }

  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      thinkingConfig: {
        includeThoughts: true,
        thinkingLevel: thinkingLevel(thinkingBudget),
      },
    },
  });

  let response: Response;
  try {
    response = await fetch(endpoint(model), {
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
      content: `Gemini API ${response.status}: ${text.slice(0, 500)}`,
      timestamp: Date.now(),
    };
    return;
  }

  try {
    yield* parseGeminiStream(response.body, signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    yield {
      type: 'error',
      content: err instanceof Error ? err.message : 'Gemini stream error',
      timestamp: Date.now(),
    };
  }
}

async function validateKey(key: string): Promise<boolean> {
  if (!key || key.length < 20) return false;
  try {
    const res = await fetch(`${API_BASE_URL}?key=${encodeURIComponent(key)}`);
    return res.status !== 401 && res.status !== 403;
  } catch {
    return false;
  }
}

export const geminiAdapter: LLMAdapter = {
  id: 'google',
  name: 'Google Gemini',
  requiresApiKey: true,
  supportedModels: SUPPORTED_MODELS,
  sendPrompt,
  validateKey,
};
