import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Download, FileImage } from 'lucide-react';
import { useSessionStore } from '@/core/store/sessionStore';
import {
  buildGraphExportFileName,
  buildStandaloneSvgDocument,
  GRAPH_EXPORT_STYLE,
} from '@/core/graph/export';
import { layoutGraph, type LaidOutEdge } from '@/core/graph/layout';
import { NODE_TYPE_CONFIG } from '@/constants/nodeTypes';
import { NodeTooltip } from './NodeTooltip';
import { flattenGraph } from '@/constants/demoGraph';
import type { ReasoningNode } from '@/core/parser/types';

const NODE_RADIUS = 14;
const EXPORT_BACKGROUND = '#0a0e17';

function edgePath(edge: LaidOutEdge): string {
  if (edge.points.length === 0) return '';
  const line = d3
    .line<{ x: number; y: number }>()
    .x((p) => p.x)
    .y((p) => p.y)
    .curve(d3.curveBasis);
  return line(edge.points) ?? '';
}

export function GraphCanvas() {
  const graph = useSessionStore((s) => s.currentGraph);
  const selectedNodeId = useSessionStore((s) => s.selectedNodeId);
  const selectNode = useSessionStore((s) => s.selectNode);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const [hoverNode, setHoverNode] = useState<ReasoningNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [exportError, setExportError] = useState<string | null>(null);

  const nodeMap = useMemo(() => {
    if (!graph) return new Map<string, ReasoningNode>();
    const m = new Map<string, ReasoningNode>();
    for (const n of flattenGraph(graph.rootNode)) m.set(n.id, n);
    return m;
  }, [graph]);

  const handleNodeHover = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      const rect = (e.currentTarget as SVGGElement).getBoundingClientRect();
      setTooltipPos({ x: rect.right + 12, y: rect.top });
      setHoverNode(node);
    },
    [nodeMap]
  );

  const handleNodeLeave = useCallback(() => setHoverNode(null), []);

  const layout = useMemo(() => (graph ? layoutGraph(graph) : null), [graph]);

  const createExportSnapshot = useCallback(() => {
    if (!svgRef.current || !graph) return null;

    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || svgRef.current.viewBox.baseVal.width || 1200;
    const height = rect.height || svgRef.current.viewBox.baseVal.height || 800;
    const bodyMarkup = [
      `<rect width="100%" height="100%" fill="${EXPORT_BACKGROUND}" />`,
      svgRef.current.innerHTML,
    ].join('\n');

    return {
      width: Math.round(width),
      height: Math.round(height),
      fileBaseId: graph.id,
      svg: buildStandaloneSvgDocument({
        width,
        height,
        title: graph.prompt || graph.id,
        bodyMarkup,
        styleText: GRAPH_EXPORT_STYLE,
      }),
    };
  }, [graph]);

  const handleExportSvg = useCallback(() => {
    const snapshot = createExportSnapshot();
    if (!snapshot) return;
    setExportError(null);
    downloadBlob(
      new Blob([snapshot.svg], { type: 'image/svg+xml;charset=utf-8' }),
      buildGraphExportFileName(snapshot.fileBaseId, 'svg')
    );
  }, [createExportSnapshot]);

  const handleExportPng = useCallback(() => {
    const snapshot = createExportSnapshot();
    if (!snapshot) return;
    setExportError(null);

    void svgToPngBlob(snapshot.svg, snapshot.width, snapshot.height)
      .then((blob) => {
        downloadBlob(blob, buildGraphExportFileName(snapshot.fileBaseId, 'png'));
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown export error';
        setExportError(message);
      });
  }, [createExportSnapshot]);

  useEffect(() => {
    if (!svgRef.current || !gRef.current || !layout) return;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    const bbox = svgRef.current.getBoundingClientRect();
    const PAD_TOP = 160;
    const PAD_BOTTOM = 80;
    const PAD_SIDE = 60;
    const availW = Math.max(bbox.width - PAD_SIDE * 2, 1);
    const availH = Math.max(bbox.height - PAD_TOP - PAD_BOTTOM, 1);
    const scale = Math.min(
      availW / Math.max(layout.width, 1),
      availH / Math.max(layout.height, 1),
      1
    );
    const tx = PAD_SIDE + (availW - layout.width * scale) / 2;
    const ty = PAD_TOP + (availH - layout.height * scale) / 2;
    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));

    return () => {
      svg.on('.zoom', null);
    };
  }, [layout]);

  if (!graph || !layout) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[color:var(--text-muted)]">
        <span className="font-mono text-sm">No graph loaded</span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg ref={svgRef} className="graph-canvas h-full w-full">
        <defs>
          <marker
            id="arrow"
            viewBox="0 -5 10 10"
            refX="8"
            refY="0"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0,-5L10,0L0,5" fill="var(--edge-default)" />
          </marker>
        </defs>
        <g ref={gRef}>
          <g className="edges">
            {layout.edges.map((e) => {
              const active = selectedNodeId === e.from || selectedNodeId === e.to;
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={edgePath(e)}
                  className={`graph-edge ${active ? 'is-active' : ''}`}
                  markerEnd="url(#arrow)"
                />
              );
            })}
          </g>
          <g className="nodes">
            {layout.nodes.map((ln) => {
              const cfg = NODE_TYPE_CONFIG[ln.node.type];
              const isSelected = selectedNodeId === ln.node.id;
              const x = ln.x - ln.width / 2;
              const y = ln.y - ln.height / 2;
              const nodeLabel = ln.node.label ?? cfg.label;
              return (
                <g
                  key={ln.node.id}
                  className={`graph-node ${isSelected ? 'is-selected' : ''}`}
                  transform={`translate(${x}, ${y})`}
                  style={{ ['--node-color' as string]: cfg.cssVar }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectNode(isSelected ? null : ln.node.id);
                  }}
                  onMouseEnter={(e) => handleNodeHover(e, ln.node.id)}
                  onMouseLeave={handleNodeLeave}
                >
                  <rect
                    className="graph-node-body"
                    width={ln.width}
                    height={ln.height}
                    rx={12}
                    ry={12}
                  />
                  <circle cx={18} cy={18} r={6} fill={cfg.cssVar} />
                  <text className="graph-node-type" x={32} y={22}>
                    {nodeLabel}
                  </text>
                  <text className="graph-node-label" x={18} y={46}>
                    {truncate(ln.node.summary, 28)}
                  </text>
                  <text
                    className="graph-node-label"
                    x={ln.width - 18}
                    y={22}
                    textAnchor="end"
                    fontSize={10}
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                  >
                    {ln.node.tokenCount}t
                  </text>
                </g>
              );
            })}
          </g>
        </g>
        {/* background click clears selection */}
        <rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill="transparent"
          onClick={() => selectNode(null)}
          pointerEvents="none"
        />
        <circle r={NODE_RADIUS} fill="transparent" pointerEvents="none" />
        <NodeTooltip node={hoverNode} x={tooltipPos.x} y={tooltipPos.y} />
      </svg>

      <div className="pointer-events-auto absolute right-4 bottom-4 z-20 flex items-center gap-2 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/85 p-1.5 shadow-[0_0_24px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <button
          type="button"
          onClick={handleExportSvg}
          title="Download SVG"
          aria-label="Download graph as SVG"
          className="rounded-md border border-[color:var(--border-subtle)] p-2 text-[color:var(--text-secondary)] transition hover:border-[color:var(--glow-analysis)] hover:text-[color:var(--glow-analysis)]"
        >
          <Download size={15} />
        </button>
        <button
          type="button"
          onClick={handleExportPng}
          title="Download PNG"
          aria-label="Download graph as PNG"
          className="rounded-md border border-[color:var(--border-subtle)] p-2 text-[color:var(--text-secondary)] transition hover:border-[color:var(--glow-hypothesis)] hover:text-[color:var(--glow-hypothesis)]"
        >
          <FileImage size={15} />
        </button>
      </div>

      {exportError && (
        <div role="alert" className="absolute right-4 bottom-20 z-20 max-w-xs rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/90 px-3 py-2 font-mono text-[10px] text-[color:var(--glow-revision)] backdrop-blur-xl">
          {exportError}
        </div>
      )}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function svgToPngBlob(svgMarkup: string, width: number, height: number): Promise<Blob> {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas export is not available in this browser.');

    ctx.fillStyle = EXPORT_BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG export failed.'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not render graph SVG for PNG export.'));
    image.src = src;
  });
}
