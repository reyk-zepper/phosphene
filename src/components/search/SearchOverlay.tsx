import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSessionStore } from '@/core/store/sessionStore';
import { flattenGraph } from '@/constants/demoGraph';
import { NODE_TYPE_CONFIG } from '@/constants/nodeTypes';
import type { ReasoningNode } from '@/core/parser/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

function searchNodes(nodes: ReasoningNode[], query: string): ReasoningNode[] {
  const q = query.toLowerCase();
  return nodes.filter(
    (n) =>
      n.summary.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  );
}

export function SearchOverlay({ open, onClose }: Props) {
  const graph = useSessionStore((s) => s.currentGraph);
  const selectNode = useSessionStore((s) => s.selectNode);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const allNodes = useMemo(
    () => (graph ? flattenGraph(graph.rootNode) : []),
    [graph]
  );

  const results = useMemo(
    () => (query.trim().length > 0 ? searchNodes(allNodes, query) : []),
    [allNodes, query]
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (nodeId: string) => {
    selectNode(nodeId);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                'color-mix(in srgb, var(--bg-primary) 75%, transparent)',
              backdropFilter: 'blur(8px)',
            }}
          />
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border"
            initial={{ scale: 0.96, y: -10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-active)',
              boxShadow:
                '0 0 60px color-mix(in srgb, var(--glow-hypothesis) 18%, transparent)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[color:var(--border-subtle)] px-4 py-3">
              <Search
                size={16}
                className="shrink-0 text-[color:var(--text-muted)]"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onClose();
                  if (e.key === 'Enter' && results.length > 0) {
                    handleSelect(results[0].id);
                  }
                }}
                placeholder="Search reasoning nodes…"
                className="flex-1 bg-transparent font-[family-name:var(--font-body)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] focus:outline-none"
              />
              <kbd className="rounded border border-[color:var(--border-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--text-muted)]">
                ESC
              </kbd>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {query.trim().length > 0 && results.length === 0 && (
                <div className="px-4 py-6 text-center font-mono text-[12px] text-[color:var(--text-muted)]">
                  No matching nodes
                </div>
              )}
              {results.map((node) => {
                const cfg = NODE_TYPE_CONFIG[node.type];
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleSelect(node.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: cfg.cssVar,
                        boxShadow: `0 0 8px ${cfg.cssVar}`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] tracking-wider uppercase" style={{ color: cfg.cssVar }}>
                        {cfg.label}
                      </span>
                      <p className="mt-0.5 truncate font-[family-name:var(--font-display)] text-[13px] text-[color:var(--text-primary)]">
                        {node.summary}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-[color:var(--text-muted)]">
                      {node.tokenCount}t
                    </span>
                  </button>
                );
              })}
            </div>

            {!query.trim() && allNodes.length > 0 && (
              <div className="border-t border-[color:var(--border-subtle)] px-4 py-2.5 font-mono text-[10px] text-[color:var(--text-muted)]">
                {allNodes.length} nodes · type to search
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
