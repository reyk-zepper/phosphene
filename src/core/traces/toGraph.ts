import type { ReasoningGraph, ReasoningNode, ReasoningNodeType } from '@/core/parser/types';
import type { NodeTrace, NodeTraceEvent, TraceEventType, TraceSource } from './types';

function eventTypeToNodeType(event: NodeTraceEvent): ReasoningNodeType {
  if (event.status === 'failed') return 'revision';
  if (event.status === 'needs_approval') return 'question';
  if (event.eventType === 'aag.decision') return 'decision';
  if (event.eventType === 'sentinel.alert') return 'revision';
  if (event.eventType === 'sentinel.recovery') return 'conclusion';
  if (event.source === 'openclaw') return 'comparison';
  if (event.source === 'aag') return 'decision';
  if (event.source === 'sentinel') return 'evidence';
  if (event.eventType === 'agent.plan') return 'analysis';
  return 'hypothesis';
}

function sourceLabel(source: TraceSource): string {
  switch (source) {
    case 'hermes':
      return 'HERMES';
    case 'openclaw':
      return 'OPENCLAW';
    case 'aag':
      return 'AAG';
    case 'sentinel':
      return 'SENTINEL';
  }
}

function eventLabel(event: NodeTraceEvent): string {
  const source = sourceLabel(event.source);
  const suffixByType: Partial<Record<TraceEventType, string>> = {
    'run.started': 'RUN',
    'agent.plan': 'PLAN',
    'tool.requested': 'TOOL',
    'tool.executed': 'TOOL',
    'aag.decision': 'GATE',
    'approval.required': 'APPROVAL',
    'worker.started': 'WORKER',
    'worker.completed': 'WORKER',
    'health.check': 'HEALTH',
    'sentinel.alert': 'ALERT',
    'sentinel.recovery': 'RECOVERY',
    'run.completed': 'DONE',
  };
  return `${source} ${suffixByType[event.eventType] ?? 'EVENT'}`;
}

function eventMetadata(event: NodeTraceEvent): Record<string, string> {
  const metadata: Record<string, string> = {
    source: sourceLabel(event.source),
    event: event.eventType,
    status: event.status,
    run: event.runId,
    time: event.timestamp,
  };
  if (event.actor) metadata.actor = event.actor;
  if (event.tool) metadata.tool = event.tool;
  if (event.decision) metadata.decision = event.decision;
  if (event.risk) metadata.risk = event.risk;
  if (event.redactedPayloadHash) metadata.payload = event.redactedPayloadHash;
  return metadata;
}

function eventContent(event: NodeTraceEvent): string {
  const lines = [event.detail.trim()];
  const metadata = eventMetadata(event);
  const entries = Object.entries(metadata).filter(([, value]) => value.trim().length > 0);
  if (entries.length > 0) {
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('|---|---|');
    for (const [key, value] of entries) {
      lines.push(`| ${key} | ${value} |`);
    }
  }
  return lines.join('\n');
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function assignDepths(node: ReasoningNode, depth = 0): number {
  node.depth = depth;
  if (node.children.length === 0) return depth;
  return Math.max(...node.children.map((child) => assignDepths(child, depth + 1)));
}

function countNodes(node: ReasoningNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

function buildNode(event: NodeTraceEvent, children: ReasoningNode[], startTime: number): ReasoningNode {
  const content = eventContent(event);
  return {
    id: event.id,
    type: eventTypeToNodeType(event),
    label: eventLabel(event),
    content,
    summary: event.summary,
    children,
    depth: 0,
    tokenCount: estimateTokens(content),
    timestamp: Math.max(0, Date.parse(event.timestamp) - startTime),
    metadata: eventMetadata(event),
  };
}

export function traceToGraph(trace: NodeTrace): ReasoningGraph {
  const roots = trace.events.filter((event) => !event.parentEventId);
  if (roots.length !== 1) {
    throw new Error('Trace must contain exactly one root event');
  }

  const byParent = new Map<string, NodeTraceEvent[]>();
  for (const event of trace.events) {
    if (!event.parentEventId) continue;
    const siblings = byParent.get(event.parentEventId) ?? [];
    siblings.push(event);
    byParent.set(event.parentEventId, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  }

  const seen = new Set<string>();
  const startTime = Date.parse(trace.startedAt);

  const walk = (event: NodeTraceEvent): ReasoningNode => {
    if (seen.has(event.id)) throw new Error(`Trace contains a cycle at event ${event.id}`);
    seen.add(event.id);
    const children = (byParent.get(event.id) ?? []).map(walk);
    return buildNode(event, children, startTime);
  };

  const rootNode = walk(roots[0]);
  const maxDepth = assignDepths(rootNode);
  const nodeCount = countNodes(rootNode);
  const totalTokens = trace.events.reduce((sum, event) => sum + estimateTokens(event.detail), 0);

  return {
    id: trace.id,
    prompt: trace.title,
    model: {
      provider: 'ollama',
      model: 'ai-node-trace',
      displayName: 'AI Node Trace',
    },
    rootNode,
    metadata: {
      totalTokens,
      reasoningTokens: totalTokens,
      outputTokens: 0,
      maxDepth,
      branchCount: Math.max(0, nodeCount - 1),
      nodeCount,
      timeToComplete: trace.events.length > 0
        ? Math.max(...trace.events.map((event) => Date.parse(event.timestamp))) - startTime
        : 0,
    },
    createdAt: startTime,
  };
}
