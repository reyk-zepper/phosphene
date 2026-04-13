import type {
  GraphMetadata,
  ModelIdentifier,
  ReasoningGraph,
  ReasoningNode,
} from '@/core/parser/types';
import { parseText, type ParsedSegment } from '@/core/parser/heuristic';
import { uuid } from '@/utils/id';

const MIN_SEGMENT_LENGTH = 8;

export interface BuildInput {
  id: string;
  prompt: string;
  model: ModelIdentifier;
  thinkingBuffer: string;
  outputBuffer: string;
  startTime: number;
}

function buildNodesLinear(
  parsed: ParsedSegment[],
  baseTimestamp: number,
  startTime: number
): ReasoningNode | null {
  if (parsed.length === 0) return null;

  const nodes: ReasoningNode[] = parsed.map((seg, idx) => ({
    id: `seg-${idx}`,
    type: seg.type,
    content: seg.text,
    summary: seg.summary,
    children: [],
    depth: seg.depth,
    tokenCount: Math.max(1, Math.ceil(seg.text.length / 4)),
    timestamp: baseTimestamp - startTime + idx * 80,
  }));

  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].children = [nodes[i + 1]];
  }

  return nodes[0];
}

export function buildGraph(input: BuildInput): ReasoningGraph | null {
  const { id, prompt, model, thinkingBuffer, outputBuffer, startTime } = input;

  if (!thinkingBuffer.trim() && !outputBuffer.trim()) return null;

  const parsed = parseText(thinkingBuffer).filter((p) => p.text.length >= MIN_SEGMENT_LENGTH);

  let root = buildNodesLinear(parsed, Date.now(), startTime);

  if (outputBuffer.trim()) {
    const finalNode: ReasoningNode = {
      id: 'final-output',
      type: 'decision',
      content: outputBuffer.trim(),
      summary:
        outputBuffer.trim().length > 80
          ? outputBuffer.trim().slice(0, 79) + '…'
          : outputBuffer.trim(),
      children: [],
      depth: parsed.length > 0 ? Math.max(...parsed.map((p) => p.depth)) + 1 : 0,
      tokenCount: Math.max(1, Math.ceil(outputBuffer.length / 4)),
      timestamp: Date.now() - startTime,
    };

    if (root) {
      let tail = root;
      while (tail.children.length > 0) tail = tail.children[tail.children.length - 1];
      tail.children = [finalNode];
    } else {
      root = finalNode;
    }
  }

  if (!root) return null;

  const nodeCount = countNodes(root);
  const reasoningTokens = estimateTokens(thinkingBuffer);
  const outputTokens = estimateTokens(outputBuffer);

  const metadata: GraphMetadata = {
    totalTokens: reasoningTokens + outputTokens,
    reasoningTokens,
    outputTokens,
    maxDepth: maxDepth(root),
    branchCount: nodeCount,
    nodeCount,
    timeToComplete: Date.now() - startTime,
  };

  return {
    id,
    prompt,
    model,
    rootNode: root,
    metadata,
    createdAt: startTime,
  };
}

function countNodes(node: ReasoningNode): number {
  let n = 1;
  for (const child of node.children) n += countNodes(child);
  return n;
}

function maxDepth(node: ReasoningNode, current = 0): number {
  if (node.children.length === 0) return current;
  return Math.max(...node.children.map((c) => maxDepth(c, current + 1)));
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function newGraphId(): string {
  return `graph-${uuid()}`;
}
