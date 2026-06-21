import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  openaiAdapter,
  parseOpenAIResponsesStream,
} from '@/core/adapters/openai';

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

describe('OpenAI Responses adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps Responses SSE events into reasoning and text chunks', async () => {
    const chunks = await collect(
      parseOpenAIResponsesStream(
        streamFrom(
          [
            'event: response.reasoning_summary_text.delta',
            'data: {"type":"response.reasoning_summary_text.delta","delta":"Check constraints."}',
            '',
            'event: response.output_text.delta',
            'data: {"type":"response.output_text.delta","delta":"Final answer"}',
            '',
            'event: response.completed',
            'data: {"type":"response.completed","response":{"status":"completed"}}',
            '',
          ].join('\n')
        )
      )
    );

    expect(chunks.map((chunk) => [chunk.type, chunk.content])).toEqual([
      ['thinking', 'Check constraints.'],
      ['text', 'Final answer'],
      ['done', ''],
    ]);
  });

  it('sends browser-safe Responses requests with reasoning summaries enabled', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(String(_url)).toBe('https://api.openai.com/v1/responses');
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({
        authorization: 'Bearer sk-openai-test',
        'content-type': 'application/json',
      });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: 'o3',
        input: [{ role: 'user', content: 'Solve this carefully.' }],
        stream: true,
        store: false,
        reasoning: { effort: 'medium', summary: 'auto' },
      });

      return new Response(
        streamFrom(
          [
            'event: response.output_text.delta',
            'data: {"type":"response.output_text.delta","delta":"Done"}',
            '',
            'event: response.completed',
            'data: {"type":"response.completed","response":{"status":"completed"}}',
            '',
          ].join('\n')
        ),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const chunks = await collect(
      openaiAdapter.sendPrompt({
        prompt: 'Solve this carefully.',
        model: 'o3',
        apiKey: 'sk-openai-test',
      })
    );

    expect(chunks.map((chunk) => [chunk.type, chunk.content])).toEqual([
      ['text', 'Done'],
      ['done', ''],
    ]);
  });

  it('surfaces API errors without leaking request headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('bad key', { status: 401, statusText: 'Unauthorized' }))
    );

    const chunks = await collect(
      openaiAdapter.sendPrompt({
        prompt: 'hello',
        model: 'o3',
        apiKey: 'sk-openai-test',
      })
    );

    expect(chunks).toEqual([
      {
        type: 'error',
        content: 'OpenAI API 401: bad key',
        timestamp: expect.any(Number),
      },
    ]);
  });
});
