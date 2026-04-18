import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Copy, Check, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSessionStore } from '@/core/store/sessionStore';
import { flattenGraph } from '@/constants/demoGraph';
import { NODE_TYPE_CONFIG } from '@/constants/nodeTypes';

export function DetailPanel() {
  const graph = useSessionStore((s) => s.currentGraph);
  const selectedNodeId = useSessionStore((s) => s.selectedNodeId);
  const selectNode = useSessionStore((s) => s.selectNode);
  const [copied, setCopied] = useState(false);

  const allNodes = useMemo(
    () => (graph ? flattenGraph(graph.rootNode) : []),
    [graph]
  );

  const nodeIndex = useMemo(
    () => allNodes.findIndex((n) => n.id === selectedNodeId),
    [allNodes, selectedNodeId]
  );

  const node = nodeIndex >= 0 ? allNodes[nodeIndex] : null;

  const goPrev = useCallback(() => {
    if (nodeIndex > 0) selectNode(allNodes[nodeIndex - 1].id);
  }, [nodeIndex, allNodes, selectNode]);

  const goNext = useCallback(() => {
    if (nodeIndex < allNodes.length - 1) selectNode(allNodes[nodeIndex + 1].id);
  }, [nodeIndex, allNodes, selectNode]);

  const handleCopy = useCallback(async () => {
    if (!node) return;
    await navigator.clipboard.writeText(node.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [node]);

  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          key={node.id}
          initial={{ x: 480, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 480, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="pointer-events-auto absolute top-4 right-4 bottom-4 z-20 flex w-[420px] max-w-[90vw] flex-col overflow-hidden rounded-2xl border backdrop-blur-xl"
          style={{
            background:
              'color-mix(in srgb, var(--bg-elevated) 92%, transparent)',
            borderColor: 'var(--border-active)',
            boxShadow: `0 0 40px color-mix(in srgb, ${NODE_TYPE_CONFIG[node.type].cssVar} 25%, transparent)`,
          }}
        >
          <header className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-5 py-3">
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: NODE_TYPE_CONFIG[node.type].cssVar,
                  boxShadow: `0 0 12px ${NODE_TYPE_CONFIG[node.type].cssVar}`,
                }}
              />
              <span
                className="font-mono text-[11px] tracking-widest uppercase"
                style={{ color: NODE_TYPE_CONFIG[node.type].cssVar }}
              >
                {NODE_TYPE_CONFIG[node.type].label}
              </span>
              <span className="font-mono text-[10px] text-[color:var(--text-muted)]">
                {nodeIndex + 1}/{allNodes.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrev}
                disabled={nodeIndex <= 0}
                aria-label="Previous node"
                className="rounded-md p-1 text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--text-primary)] disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={nodeIndex >= allNodes.length - 1}
                aria-label="Next node"
                className="rounded-md p-1 text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--text-primary)] disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy content"
                className="rounded-md p-1 text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--text-primary)]"
              >
                {copied ? <Check size={14} className="text-[color:var(--glow-evidence)]" /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                className="rounded-md p-1 text-[color:var(--text-secondary)] transition hover:bg-white/5 hover:text-[color:var(--text-primary)]"
                onClick={() => selectNode(null)}
                aria-label="Close detail panel"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg leading-tight font-semibold text-[color:var(--text-primary)]">
              {node.summary}
            </h2>

            <div className="prose-phosphene mt-4">
              <Markdown remarkPlugins={[remarkGfm]}>{node.content}</Markdown>
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="Tokens" value={String(node.tokenCount)} />
              <Stat label="Depth" value={String(node.depth)} />
              <Stat
                label="Confidence"
                value={
                  node.confidence != null
                    ? `${Math.round(node.confidence * 100)}%`
                    : '—'
                }
              />
            </dl>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] px-3 py-2">
      <dt className="font-mono text-[10px] tracking-wider text-[color:var(--text-muted)] uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-[family-name:var(--font-display)] text-sm text-[color:var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}
