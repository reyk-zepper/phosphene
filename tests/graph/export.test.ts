import { describe, expect, it } from 'vitest';
import {
  buildGraphExportFileName,
  buildStandaloneSvgDocument,
  GRAPH_EXPORT_STYLE,
  sanitizeGraphExportName,
} from '@/core/graph/export';

describe('graph export helpers', () => {
  it('sanitizes graph ids into stable export slugs', () => {
    expect(sanitizeGraphExportName('Hermes -> AAG / Gmail Draft')).toBe('hermes-aag-gmail-draft');
    expect(sanitizeGraphExportName('  ###  ')).toBe('graph');
  });

  it('builds deterministic SVG and PNG filenames from graph ids', () => {
    const timestamp = new Date('2026-06-21T17:22:46.297Z');

    expect(buildGraphExportFileName('trace-hermes-aag', 'svg', timestamp)).toBe(
      'phosphene-trace-hermes-aag-20260621-172246.svg'
    );
    expect(buildGraphExportFileName('trace-hermes-aag', 'png', timestamp)).toBe(
      'phosphene-trace-hermes-aag-20260621-172246.png'
    );
  });

  it('wraps rendered graph markup in a standalone SVG document with escaped metadata', () => {
    const svg = buildStandaloneSvgDocument({
      width: 1200,
      height: 800,
      title: 'Hermes & AAG <Snapshot>',
      bodyMarkup: '<g><text>Node</text></g>',
      styleText: '.graph-node { fill: var(--text-primary); }',
    });

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="800"');
    expect(svg).toContain('viewBox="0 0 1200 800"');
    expect(svg).toContain('<title>Hermes &amp; AAG &lt;Snapshot&gt;</title>');
    expect(svg).toContain('<style><![CDATA[');
    expect(svg).toContain('<g><text>Node</text></g>');
  });

  it('embeds every graph color token required by standalone exports', () => {
    expect(GRAPH_EXPORT_STYLE).toContain('--glow-hypothesis: #00f5d4;');
    expect(GRAPH_EXPORT_STYLE).toContain('--glow-analysis: #7b61ff;');
    expect(GRAPH_EXPORT_STYLE).toContain('--glow-conclusion: #fee440;');
    expect(GRAPH_EXPORT_STYLE).toContain('--glow-question: #f72585;');
    expect(GRAPH_EXPORT_STYLE).toContain('--glow-comparison: #4cc9f0;');
    expect(GRAPH_EXPORT_STYLE).toContain('--glow-evidence: #80ffdb;');
    expect(GRAPH_EXPORT_STYLE).toContain('--glow-revision: #ff6b35;');
    expect(GRAPH_EXPORT_STYLE).toContain('--glow-decision: #b5e48c;');
  });
});
