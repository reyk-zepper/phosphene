import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_GRAPH } from '@/constants/demoGraph';
import {
  classify,
  parseText,
  segment,
  summarize,
} from '@/packages/parser';
import {
  buildGraphExportFileName,
  collectGraphEdges,
  compareGraphs,
  flattenGraph,
  searchGraphNodes,
  summarizeGraphStats,
} from '@/packages/graph';

const rootDir = path.resolve(import.meta.dirname, '../..');

describe('public parser and graph package surface', () => {
  it('exposes parser primitives without requiring UI code', () => {
    expect(segment('First thought.\n\n- nested evidence')).toHaveLength(2);
    expect(classify('Wait, I need to reconsider that step.')).toBe('revision');
    expect(summarize('Therefore the answer is stable. More detail follows.', 24)).toBe('Therefore the answer is…');
    expect(parseText('What if we compare both options?')[0]).toMatchObject({
      type: 'question',
      summary: 'What if we compare both options?',
    });
  });

  it('exposes graph primitives from a single package entry point', () => {
    expect(flattenGraph(DEMO_GRAPH.rootNode).map((node) => node.id)).toContain('n8');
    expect(collectGraphEdges(DEMO_GRAPH.rootNode)[0]).toEqual({ from: 'n1', to: 'n2' });
    expect(searchGraphNodes(DEMO_GRAPH.rootNode, 'type:revision').map((result) => result.node.id)).toEqual(['n6']);
    expect(summarizeGraphStats(DEMO_GRAPH).overview.nodeCount).toBe(DEMO_GRAPH.metadata.nodeCount);
    expect(compareGraphs(DEMO_GRAPH, DEMO_GRAPH).samePrompt).toBe(true);
    expect(buildGraphExportFileName('Parser / Graph Surface', 'json', new Date('2026-06-21T20:30:00Z'))).toBe(
      'phosphene-parser-graph-surface-20260621-203000.json'
    );
  });

  it('declares parser and graph package entry points in package metadata', async () => {
    const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8')) as {
      exports?: Record<string, { types: string; default: string }>;
    };

    expect(pkg.exports).toMatchObject({
      './parser': {
        types: './dist-types/packages/parser.d.ts',
        import: './dist-packages/parser.js',
        default: './dist-packages/parser.js',
      },
      './graph': {
        types: './dist-types/packages/graph.d.ts',
        import: './dist-packages/graph.js',
        default: './dist-packages/graph.js',
      },
    });
  });

  it('keeps public package entry points independent from app, UI, stores, and demos', async () => {
    const files = [
      'src/packages/parser.ts',
      'src/packages/graph.ts',
      'src/core/graph/traversal.ts',
      'src/core/graph/layout.ts',
    ];
    const forbidden = /@\/(?:app|components|constants|hooks|core\/store|core\/adapters)\b/;

    for (const file of files) {
      const source = await readFile(path.join(rootDir, file), 'utf8');
      expect(source, `${file} should stay package-safe`).not.toMatch(forbidden);
    }
  });
});
