import { describe, expect, it } from 'vitest';
import { DEMO_GRAPH } from '@/constants/demoGraph';
import {
  buildSessionBundleFileName,
  createPortableSessionBundle,
  parsePortableSessionBundle,
} from '@/core/history/sessionBundle';
import type { ReasoningGraph } from '@/core/parser/types';

const graphWith = (overrides: Partial<ReasoningGraph>): ReasoningGraph => ({
  ...DEMO_GRAPH,
  ...overrides,
  model: overrides.model ?? DEMO_GRAPH.model,
  metadata: overrides.metadata ?? DEMO_GRAPH.metadata,
  rootNode: overrides.rootNode ?? DEMO_GRAPH.rootNode,
});

describe('portable session bundles', () => {
  it('creates a versioned local-only session bundle from a safe graph', () => {
    const bundle = createPortableSessionBundle(DEMO_GRAPH, {
      exportedAt: new Date('2026-06-21T20:15:00Z'),
      maxPromptLength: 36,
    });

    expect(bundle).toMatchObject({
      schema_version: 'phosphene.session.v0.1.25',
      source: 'phosphene_portable_session',
      data_classification: 'client_local_reasoning_session',
      exported_at: '2026-06-21T20:15:00.000Z',
      graph_id: 'demo-river-crossing',
      prompt_preview: 'A farmer needs to cross a river...',
      graph: DEMO_GRAPH,
    });
    expect(JSON.stringify(bundle)).not.toContain('localStorage');
  });

  it('round-trips a portable session bundle into a safe graph and history entry', () => {
    const bundle = createPortableSessionBundle(DEMO_GRAPH, {
      exportedAt: new Date('2026-06-21T20:15:00Z'),
    });

    const result = parsePortableSessionBundle(JSON.stringify(bundle), { now: 2_000 });

    expect(result.status).toBe('imported');
    if (result.status !== 'imported') throw new Error(result.errors.join(', '));
    expect(result.graph).toEqual(DEMO_GRAPH);
    expect(result.historyEntry.graphId).toBe(DEMO_GRAPH.id);
    expect(result.historyEntry.updatedAt).toBe(2_000);
  });

  it('blocks malformed, unsupported, or unsafe session bundles', () => {
    expect(parsePortableSessionBundle('{')).toMatchObject({
      status: 'blocked',
      errors: ['Session bundle is not valid JSON.'],
    });

    expect(parsePortableSessionBundle(JSON.stringify({
      schema_version: 'phosphene.session.v9',
      graph: DEMO_GRAPH,
    }))).toMatchObject({
      status: 'blocked',
      errors: ['Session bundle schema is unsupported.'],
    });

    const unsafeGraph = graphWith({
      id: 'unsafe-portable-session',
      prompt: 'Use api_key=sk-portable-session-secret while debugging.',
    });
    expect(createPortableSessionBundle(unsafeGraph)).toBeNull();
    expect(parsePortableSessionBundle(JSON.stringify({
      schema_version: 'phosphene.session.v0.1.25',
      source: 'phosphene_portable_session',
      data_classification: 'client_local_reasoning_session',
      exported_at: '2026-06-21T20:15:00.000Z',
      graph_id: unsafeGraph.id,
      prompt_preview: 'unsafe',
      graph: unsafeGraph,
    }))).toMatchObject({
      status: 'blocked',
      errors: ['Session graph contains secret-like content.'],
    });
  });

  it('builds stable portable session filenames without prompt content', () => {
    expect(buildSessionBundleFileName('Hermes -> AAG / Gmail Draft', new Date('2026-06-21T20:15:00Z'))).toBe(
      'phosphene-session-hermes-aag-gmail-draft-20260621-201500.json'
    );
  });
});
