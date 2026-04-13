import type { ReasoningNodeType } from './types';
import { segment, type Segment } from './segmenter';

const SIGNAL_PATTERNS: Record<ReasoningNodeType, RegExp[]> = {
  hypothesis: [
    /^(I think|My guess|I believe|It seems|Perhaps|Probably|I suspect)/i,
    /^(Let me hypothesize|My initial thought|Maybe)/i,
  ],
  analysis: [
    /^(Let me (think|consider|analyze|examine|look|break))/i,
    /^(Looking at|Considering|Analyzing|Examining|Breaking down)/i,
    /^(First,|Second,|Third,|Next,|Then,|Now)/i,
  ],
  conclusion: [
    /^(Therefore|Thus|So,|In conclusion|To summarize|The answer is)/i,
    /^(In summary|Overall|Ultimately|Finally,)/i,
  ],
  question: [
    /^(But what|What if|How (would|could|does)|Why (would|does))/i,
    /^(I wonder|Could it be|Is it possible)/i,
    /\?\s*$/,
  ],
  comparison: [
    /^(On the other hand|However|Alternatively|In contrast)/i,
    /^(Compared to|Unlike|Whereas|But\b|Yet)/i,
    /^(Option [A-Z0-9]|Approach [A-Z0-9])/i,
  ],
  evidence: [
    /^(The (data|evidence|research|facts) (shows?|suggests?|indicates?))/i,
    /^(According to|Based on|Studies show|Evidence suggests)/i,
  ],
  revision: [
    /^(Wait|Actually|Hold on|I need to reconsider|Let me correct)/i,
    /^(No,|Hmm,|On second thought|I was wrong)/i,
  ],
  decision: [
    /^(I('ll| will) go with|The best (approach|option|answer))/i,
    /^(My (recommendation|decision|choice) is)/i,
  ],
};

const DETECTION_ORDER: ReasoningNodeType[] = [
  'revision',
  'decision',
  'conclusion',
  'question',
  'comparison',
  'evidence',
  'hypothesis',
  'analysis',
];

export function classify(text: string): ReasoningNodeType {
  for (const type of DETECTION_ORDER) {
    for (const pattern of SIGNAL_PATTERNS[type]) {
      if (pattern.test(text)) return type;
    }
  }
  return 'analysis';
}

export function summarize(text: string, max = 80): string {
  const firstSentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
  const trimmed = firstSentence.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + '…';
}

export interface ParsedSegment extends Segment {
  type: ReasoningNodeType;
  summary: string;
}

export function parseText(text: string): ParsedSegment[] {
  return segment(text).map((seg) => ({
    ...seg,
    type: classify(seg.text),
    summary: summarize(seg.text),
  }));
}
