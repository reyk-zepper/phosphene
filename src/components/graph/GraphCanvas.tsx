import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Download, FileImage, Share2 } from 'lucide-react';
import { useSessionStore } from '@/core/store/sessionStore';
import {
  buildGraphExportFileName,
  buildStandaloneSvgDocument,
  GRAPH_EXPORT_STYLE,
} from '@/core/graph/export';
import { layoutGraph, type LaidOutEdge } from '@/core/graph/layout';
import { NODE_TYPE_CONFIG } from '@/constants/nodeTypes';
import { NodeTooltip } from './NodeTooltip';
import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';

const NODE_RADIUS = 14;
const EXPORT_BACKGROUND = '#0a0e17';

interface GraphCanvasProps {
  shareUrl?: string;
  graph?: ReasoningGraph | null;
  selectedNodeId?: string | null;
  onSelectNode?: (id: string | null) => void;
  showControls?: boolean;
  fitPadding?: {
    top: number;
    bottom: number;
    side: number;
  };
}

function edgePath(edge: LaidOutEdge): string {
  if (edge.points.length === 0) return '';
  const line = d3
    .line<{ x: number; y: number }>()
    .x((p) => p.x)
    .y((p) => p.y)
    .curve(d3.curveBasis);
  return line(edge.points) ?? '';
}

export function GraphCanvas({
  shareUrl,
  graph: graphProp,
  selectedNodeId: selectedNodeIdProp,
  onSelectNode,
  showControls = true,
  fitPadding,
}: GraphCanvasProps) {
  const storeGraph = useSessionStore((s) => s.currentGraph);
  const storeSelectedNodeId = useSessionStore((s) => s.selectedNodeId);
  const storeSelectNode = useSessionStore((s) => s.selectNode);
  const graph = graphProp === undefined ? storeGraph : graphProp;
  const selectedNodeId = selectedNodeIdProp === undefined ? storeSelectedNodeId : selectedNodeIdProp;
  const selectNode = onSelectNode ?? storeSelectNode;

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const markerId = useStableSvgId('arrow', graph?.id);

  const [hoverNode, setHoverNode] = useState<ReasoningNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [exportError, setExportError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const layout = useMemo(() => (graph ? layoutGraph(graph) : null), [graph]);

  const nodeMap = useMemo(() => {
    if (!layout) return new Map<string, ReasoningNode>();
    const m = new Map<string, ReasoningNode>();
    for (const laidOutNode of layout.nodes) m.set(laidOutNode.node.id, laidOutNode.node);
    return m;
  }, [layout]);

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

  const handleCopyShareUrl = useCallback(() => {
    if (!shareUrl) return;
    setExportError(null);

    if (!navigator.clipboard?.writeText) {
      setExportError('Clipboard is not available in this browser.');
      return;
    }

    void navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setShareStatus('Share link copied');
        window.setTimeout(() => setShareStatus(null), 1800);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Could not copy share link.';
        setExportError(message);
      });
  }, [shareUrl]);

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
    const PAD_TOP = fitPadding?.top ?? 160;
    const PAD_BOTTOM = fitPadding?.bottom ?? 80;
    const PAD_SIDE = fitPadding?.side ?? 60;
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
  }, [fitPadding?.bottom, fitPadding?.side, fitPadding?.top, layout]);

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
            id={markerId}
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
                  markerEnd={`url(#${markerId})`}
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

      {showControls && (
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
          <button
            type="button"
            onClick={handleCopyShareUrl}
            title="Copy share link"
            aria-label="Copy share link"
            disabled={!shareUrl}
            className="rounded-md border border-[color:var(--border-subtle)] p-2 text-[color:var(--text-secondary)] transition hover:border-[color:var(--glow-decision)] hover:text-[color:var(--glow-decision)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Share2 size={15} />
          </button>
        </div>
      )}

      {(exportError || shareStatus) && (
        <div
          role={exportError ? 'alert' : 'status'}
          className="absolute right-4 bottom-20 z-20 max-w-xs rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-secondary)]/90 px-3 py-2 font-mono text-[10px] backdrop-blur-xl"
          style={{ color: exportError ? 'var(--glow-revision)' : 'var(--glow-decision)' }}
        >
          {exportError ?? shareStatus}
        </div>
      )}
    </div>
  );
}

function useStableSvgId(prefix: string, seed?: string): string {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const safeSeed = seed?.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${prefix}-${safeSeed ?? reactId}`;
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
