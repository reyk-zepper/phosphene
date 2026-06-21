export type GraphExportFormat = 'svg' | 'png' | 'json';

export const GRAPH_EXPORT_STYLE = `
:root {
  --bg-primary: #0a0e17;
  --bg-elevated: #1e2a45;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --edge-default: rgba(148, 163, 184, 0.38);
  --edge-active: #00f5d4;
  --glow-hypothesis: #00f5d4;
  --glow-analysis: #7b61ff;
  --glow-conclusion: #fee440;
  --glow-question: #f72585;
  --glow-comparison: #4cc9f0;
  --glow-evidence: #80ffdb;
  --glow-revision: #ff6b35;
  --glow-decision: #b5e48c;
}
.graph-node-body {
  fill: var(--bg-elevated);
  stroke: var(--node-color, var(--glow-analysis));
  stroke-width: 1.5;
}
.graph-node-label {
  fill: var(--text-primary);
  font-family: Outfit, "IBM Plex Sans", system-ui, sans-serif;
  font-weight: 500;
  font-size: 13px;
}
.graph-node-type {
  fill: var(--node-color, var(--glow-analysis));
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.graph-edge {
  fill: none;
  stroke: var(--edge-default);
  stroke-width: 1.5;
}
.graph-edge.is-active {
  stroke: var(--edge-active);
  stroke-width: 2;
}
`;

export interface StandaloneSvgDocumentInput {
  width: number;
  height: number;
  title: string;
  bodyMarkup: string;
  styleText?: string;
}

export function sanitizeGraphExportName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'graph';
}

export function buildGraphExportFileName(
  graphId: string,
  format: GraphExportFormat,
  timestamp = new Date()
): string {
  const stamp = timestamp
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-');

  return `phosphene-${sanitizeGraphExportName(graphId)}-${stamp}.${format}`;
}

export function buildStandaloneSvgDocument({
  width,
  height,
  title,
  bodyMarkup,
  styleText = '',
}: StandaloneSvgDocumentInput): string {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">`,
    `<title>${escapeXmlText(title)}</title>`,
    styleText ? `<style><![CDATA[${styleText}]]></style>` : '',
    bodyMarkup,
    '</svg>',
  ].filter(Boolean).join('\n');
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
