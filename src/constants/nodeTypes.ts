import type { ReasoningNodeType } from '@/core/parser/types';

export interface NodeTypeConfig {
  label: string;
  cssVar: string;
  description: string;
}

export const NODE_TYPE_CONFIG: Record<ReasoningNodeType, NodeTypeConfig> = {
  hypothesis: {
    label: 'Hypothesis',
    cssVar: 'var(--glow-hypothesis)',
    description: 'An initial guess or proposed idea',
  },
  analysis: {
    label: 'Analysis',
    cssVar: 'var(--glow-analysis)',
    description: 'Examining details, breaking things down',
  },
  conclusion: {
    label: 'Conclusion',
    cssVar: 'var(--glow-conclusion)',
    description: 'A summary or final answer',
  },
  question: {
    label: 'Question',
    cssVar: 'var(--glow-question)',
    description: 'Probing further, asking what-if',
  },
  comparison: {
    label: 'Comparison',
    cssVar: 'var(--glow-comparison)',
    description: 'Weighing alternatives',
  },
  evidence: {
    label: 'Evidence',
    cssVar: 'var(--glow-evidence)',
    description: 'Citing data, facts, or prior knowledge',
  },
  revision: {
    label: 'Revision',
    cssVar: 'var(--glow-revision)',
    description: 'Correcting or reconsidering',
  },
  decision: {
    label: 'Decision',
    cssVar: 'var(--glow-decision)',
    description: 'Committing to a path',
  },
};

export const NODE_TYPE_ORDER: ReasoningNodeType[] = [
  'hypothesis',
  'analysis',
  'evidence',
  'comparison',
  'question',
  'revision',
  'conclusion',
  'decision',
];
