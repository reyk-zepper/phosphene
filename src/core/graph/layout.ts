import dagre from 'dagre';
import type { ReasoningGraph, ReasoningNode } from '@/core/parser/types';
import { collectEdges, flattenGraph } from '@/constants/demoGraph';

export interface LaidOutNode {
  node: ReasoningNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaidOutEdge {
  from: string;
  to: string;
  points: Array<{ x: number; y: number }>;
}

export interface LaidOutGraph {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
}

const NODE_WIDTH = 220;
const NODE_HEIGHT = 72;

export function layoutGraph(graph: ReasoningGraph): LaidOutGraph {
  const g = new dagre.graphlib.Graph<{}>();
  g.setGraph({
    rankdir: 'TB',
    nodesep: 60,
    ranksep: 90,
    marginx: 40,
    marginy: 40,
  });
  g.setDefaultEdgeLabel(() => ({}));

  const nodes = flattenGraph(graph.rootNode);
  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const edgeTuples = collectEdges(graph.rootNode);
  for (const e of edgeTuples) {
    g.setEdge(e.from, e.to);
  }

  dagre.layout(g);

  const laidOutNodes: LaidOutNode[] = nodes.map((n) => {
    const d = g.node(n.id);
    return {
      node: n,
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
    };
  });

  const laidOutEdges: LaidOutEdge[] = edgeTuples.map((e) => {
    const d = g.edge(e.from, e.to);
    return {
      from: e.from,
      to: e.to,
      points: d.points.map((p) => ({ x: p.x, y: p.y })),
    };
  });

  const gg = g.graph();
  return {
    nodes: laidOutNodes,
    edges: laidOutEdges,
    width: gg.width ?? 0,
    height: gg.height ?? 0,
  };
}
