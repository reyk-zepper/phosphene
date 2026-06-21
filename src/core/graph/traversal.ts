import type { ReasoningNode } from '@/core/parser/types';

export interface GraphEdge {
  from: string;
  to: string;
}

export function flattenGraph(root: ReasoningNode): ReasoningNode[] {
  const nodes: ReasoningNode[] = [];
  const walk = (node: ReasoningNode) => {
    nodes.push(node);
    node.children.forEach(walk);
  };
  walk(root);
  return nodes;
}

export function collectGraphEdges(root: ReasoningNode): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const walk = (node: ReasoningNode) => {
    for (const child of node.children) {
      edges.push({ from: node.id, to: child.id });
      walk(child);
    }
  };
  walk(root);
  return edges;
}
