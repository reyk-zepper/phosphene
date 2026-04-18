import { AnimatePresence, motion } from 'framer-motion';
import { NODE_TYPE_CONFIG } from '@/constants/nodeTypes';
import type { ReasoningNode } from '@/core/parser/types';

interface Props {
  node: ReasoningNode | null;
  x: number;
  y: number;
}

export function NodeTooltip({ node, x, y }: Props) {
  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.12 }}
          className="pointer-events-none fixed z-40 w-64 rounded-xl border px-4 py-3"
          style={{
            left: x,
            top: y,
            background: 'var(--bg-elevated)',
            borderColor: NODE_TYPE_CONFIG[node.type].cssVar,
            boxShadow: `0 0 24px color-mix(in srgb, ${NODE_TYPE_CONFIG[node.type].cssVar} 25%, transparent)`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: NODE_TYPE_CONFIG[node.type].cssVar,
                boxShadow: `0 0 8px ${NODE_TYPE_CONFIG[node.type].cssVar}`,
              }}
            />
            <span
              className="font-mono text-[10px] tracking-wider uppercase"
              style={{ color: NODE_TYPE_CONFIG[node.type].cssVar }}
            >
              {NODE_TYPE_CONFIG[node.type].label}
            </span>
          </div>
          <p className="mt-2 line-clamp-3 font-[family-name:var(--font-body)] text-[12px] leading-relaxed text-[color:var(--text-secondary)]">
            {node.content.slice(0, 200)}
            {node.content.length > 200 ? '…' : ''}
          </p>
          <div className="mt-2 flex gap-3 font-mono text-[10px] text-[color:var(--text-muted)]">
            <span>{node.tokenCount} tokens</span>
            <span>depth {node.depth}</span>
            {node.children.length > 0 && (
              <span>{node.children.length} children</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
