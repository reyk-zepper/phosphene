import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useSessionStore } from '@/core/store/sessionStore';
import { layoutGraph, type LaidOutEdge } from '@/core/graph/layout';
import { NODE_TYPE_CONFIG } from '@/constants/nodeTypes';
import { NodeTooltip } from './NodeTooltip';
import { flattenGraph } from '@/constants/demoGraph';
import type { ReasoningNode } from '@/core/parser/types';

const NODE_RADIUS = 14;

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
                  {cfg.label}
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
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
