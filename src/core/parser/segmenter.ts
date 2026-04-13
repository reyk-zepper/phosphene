export interface Segment {
  text: string;
  depth: number;
  order: number;
}

const LIST_MARKER = /^(\s*)(?:[-*•]\s+|\d+[.)]\s+)/;

export function segment(text: string): Segment[] {
  if (!text.trim()) return [];
  const paragraphs = text.split(/\n{2,}/);
  const segments: Segment[] = [];
  let baseDepth = 0;
  let order = 0;

  for (const raw of paragraphs) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n');
    const firstLine = lines[0] ?? '';
    const listMatch = LIST_MARKER.exec(firstLine);

    if (listMatch) {
      const indent = listMatch[1].length;
      const indentDepth = Math.floor(indent / 2);
      segments.push({
        text: trimmed,
        depth: baseDepth + 1 + indentDepth,
        order: order++,
      });
    } else {
      baseDepth = Math.max(0, Math.min(2, Math.floor(order / 4)));
      segments.push({
        text: trimmed,
        depth: baseDepth,
        order: order++,
      });
    }
  }

  return segments;
}
