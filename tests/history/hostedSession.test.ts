import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DEMO_GRAPH } from '@/constants/demoGraph';
import {
  HOSTED_SESSION_MARKER_SCHEMA_VERSION,
  loadHostedSessionBundle,
} from '@/core/history/hostedSession';
import { createPortableSessionBundle } from '@/core/history/sessionBundle';

const rootDir = path.resolve(import.meta.dirname, '../..');

function response(text: string, init: ResponseInit = {}) {
  return new Response(text, {
    status: 200,
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
    ...init,
  });
}

function createFetcher(files: Record<string, string>, init: ResponseInit = {}) {
  return async (input: string) => {
    const text = files[input];
    if (text == null) return response('not found', { status: 404 });
    return response(text, init);
  };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

describe('hosted session bundles', () => {
  it('loads a hosted marker and validates the referenced portable session bundle', async () => {
    const bundle = createPortableSessionBundle(DEMO_GRAPH, {
      exportedAt: new Date('2026-06-21T22:00:00Z'),
    });
    const bundleText = `${JSON.stringify(bundle, null, 2)}\n`;
    const marker = {
      schema_version: HOSTED_SESSION_MARKER_SCHEMA_VERSION,
      updated_at: '2026-06-21T22:00:00.000Z',
      source: 'phosphene_hosted_session',
      data_classification: 'public_reasoning_session_bundle',
      latest_session: 'hosted-session-20260621T220000Z',
      session_file: 'hosted-session-20260621T220000Z/session.json',
      session_sha256: await sha256(bundleText),
      retention_count: 3,
    };

    const result = await loadHostedSessionBundle(createFetcher({
      '/sessions/hosted/latest.json': JSON.stringify(marker),
      '/sessions/hosted/hosted-session-20260621T220000Z/session.json': bundleText,
    }));

    expect(result.status).toBe('available');
    expect(result.marker?.latestSession).toBe('hosted-session-20260621T220000Z');
    expect(result.bundleText).toBe(bundleText);
    expect(result.importResult?.status).toBe('imported');
    if (result.importResult?.status !== 'imported') throw new Error(result.errors.join(', '));
    expect(result.importResult.historyEntry.graphId).toBe(DEMO_GRAPH.id);
  });

  it('blocks hosted markers that point outside the hosted session pack', async () => {
    const result = await loadHostedSessionBundle(createFetcher({
      '/sessions/hosted/latest.json': JSON.stringify({
        schema_version: HOSTED_SESSION_MARKER_SCHEMA_VERSION,
        updated_at: '2026-06-21T22:00:00.000Z',
        source: 'phosphene_hosted_session',
        data_classification: 'public_reasoning_session_bundle',
        latest_session: 'hosted-session-20260621T220000Z',
        session_file: '../private/session.json',
        session_sha256: `sha256:${'0'.repeat(64)}`,
      }),
    }));

    expect(result.status).toBe('blocked');
    expect(result.errors).toContain('latest.json: session_file must be a relative hosted session reference');
  });

  it('treats missing or HTML fallback markers as unavailable', async () => {
    await expect(loadHostedSessionBundle(createFetcher({}))).resolves.toMatchObject({
      status: 'unavailable',
    });

    await expect(loadHostedSessionBundle(createFetcher({
      '/sessions/hosted/latest.json': '<!doctype html><html></html>',
    }, {
      headers: { 'content-type': 'text/html' },
    }))).resolves.toMatchObject({
      status: 'unavailable',
      errors: ['latest marker unavailable: /sessions/hosted/latest.json: HTML fallback'],
    });
  });

  it('blocks hosted session bundles whose digest or portable-session guardrail fails', async () => {
    const unsafeBundle = createPortableSessionBundle({
      ...DEMO_GRAPH,
      prompt: 'Use api_key=sk-hosted-session-secret while debugging.',
    });
    expect(unsafeBundle).toBeNull();

    const bundle = createPortableSessionBundle(DEMO_GRAPH, {
      exportedAt: new Date('2026-06-21T22:00:00Z'),
    });
    const bundleText = `${JSON.stringify(bundle, null, 2)}\n`;
    const marker = {
      schema_version: HOSTED_SESSION_MARKER_SCHEMA_VERSION,
      updated_at: '2026-06-21T22:00:00.000Z',
      source: 'phosphene_hosted_session',
      data_classification: 'public_reasoning_session_bundle',
      latest_session: 'hosted-session-20260621T220000Z',
      session_file: 'hosted-session-20260621T220000Z/session.json',
      session_sha256: `sha256:${'f'.repeat(64)}`,
    };

    const result = await loadHostedSessionBundle(createFetcher({
      '/sessions/hosted/latest.json': JSON.stringify(marker),
      '/sessions/hosted/hosted-session-20260621T220000Z/session.json': bundleText,
    }));

    expect(result.status).toBe('blocked');
    expect(result.errors).toContain('session.json: sha256 digest did not match latest marker');
  });

  it('keeps the checked-in hosted demo session fixture loadable', async () => {
    const publicRoot = path.join(rootDir, 'public/sessions/hosted');
    const result = await loadHostedSessionBundle(async (input) => {
      const relative = input.replace(/^\/sessions\/hosted\/?/, '');
      return response(await readFile(path.join(publicRoot, relative), 'utf8'));
    });

    expect(result.status).toBe('available');
    expect(result.importResult?.status).toBe('imported');
    if (result.importResult?.status !== 'imported') throw new Error(result.errors.join(', '));
    expect(result.importResult.graph.id).toBe('hosted-session-workflow-demo');
    expect(result.importResult.historyEntry.promptPreview).toBe('Inspect a hosted Phosphene session handoff without putting graph content in the URL.');
  });
});
