import type { Highlight, TextSegment } from '../types/library';

/**
 * Decomposes text into non-overlapping segments based on highlight ranges.
 * The resulting segments cover the entire text from 0 to text.length.
 */
export function computeSegments(text: string, highlights: Highlight[]): TextSegment[] {
  if (text.length === 0) {
    return [];
  }

  const points = new Set<number>([0, text.length]);
  highlights.forEach(h => {
    // Only include points that are within the valid text range
    if (h.start >= 0 && h.start <= text.length) points.add(h.start);
    if (h.end >= 0 && h.end <= text.length) points.add(h.end);
  });
  
  const sortedPoints = Array.from(points).sort((a, b) => a - b);
  const segments: TextSegment[] = [];
  
  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const start = sortedPoints[i];
    const end = sortedPoints[i + 1];
    
    // Skip zero-length segments if they occur (e.g. if set logic failed somehow)
    if (start === end) continue;

    // Find highlights that cover this entire interval.
    // A highlight covers [start, end] if h.start <= start AND h.end >= end.
    const activeHighlights = highlights.filter(h => h.start <= start && h.end >= end);
    
    segments.push({ start, end, highlights: activeHighlights });
  }
  
  return segments;
}
