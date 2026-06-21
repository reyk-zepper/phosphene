import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  geminiAdapter,
  parseGeminiStream,
} from '@/core/adapters/gemini';

function streamFrom(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

async function collect<T>(stream: AsyncGenerator<T>): Promise<T[]> {
  const chunks: T[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

describe('Gemini adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps Gemini SSE parts into thinking and text chunks', async () => {
    const chunks = await collect(
      parseGeminiStream(
        streamFrom(
          [
            'data: {"candidates":[{"content":{"parts":[{"text":"Check constraints.","thought":true}]}}]}',
            '',
            'data: {"candidates":[{"content":{"parts":[{"text":"Final answer."}]}}]}',
            '',
          ].join('\n')
        )
      )
    );

    expect(chunks.map((chunk) => [chunk.type, chunk.content])).toEqual([
      ['thinking', 'Check constraints.'],
      ['text', 'Final answer.'],
      ['done', ''],
    ]);
  });

  it('sends streamGenerateContent requests with thinking summaries enabled', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(String(_url)).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse'
      );
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({
        'content-type': 'application/json',
        'x-goog-api-key': 'gemini-test-key',
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Solve this carefully.' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 16000,
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: 'medium',
          },
        },
      });

      return new Response(
        streamFrom(
          [
            'data: {"candidates":[{"content":{"parts":[{"text":"Done"}]}}]}',
            '',
          ].join('\n')
        ),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const chunks = await collect(
      geminiAdapter.sendPrompt({
        prompt: 'Solve this carefully.',
        model: 'gemini-3.5-flash',
        apiKey: 'gemini-test-key',
      })
    );

    expect(chunks.map((chunk) => [chunk.type, chunk.content])).toEqual([
      ['text', 'Done'],
      ['done', ''],
    ]);
  });

  it('surfaces Gemini API errors without exposing the API key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('invalid key', {
          status: 403,
          statusText: 'Forbidden',
        })
      )
    );

    const chunks = await collect(
      geminiAdapter.sendPrompt({
        prompt: 'hello',
        model: 'gemini-3.5-flash',
        apiKey: 'gemini-test-key',
      })
    );

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'Gemini API 403: invalid key',
        timestamp: expect.any(Number),
      },
    ]);
  });
});
