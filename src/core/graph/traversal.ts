import type { ReasoningNode } from '../parser/types';

export interface GraphEdge {
  from: string;
  to: string;
}

export function flattenGraph(root: ReasoningNode): ReasoningNode[] {
  const nodes: ReasoningNode[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    nodes.push(node);

    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      stack.push(node.children[index]);
    }
  }

  return nodes;
}

export function collectGraphEdges(root: ReasoningNode): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const stack: Array<{ node: ReasoningNode; nextChildIndex: number }> = [
    { node: root, nextChildIndex: 0 },
  ];

  while (stack.length > 0) {
    const frame = stack.at(-1);
    if (!frame) break;

    const child = frame.node.children[frame.nextChildIndex];
    if (!child) {
      stack.pop();
      continue;
    }

    frame.nextChildIndex += 1;
    edges.push({ from: frame.node.id, to: child.id });
    stack.push({ node: child, nextChildIndex: 0 });
  }

  return edges;
}
