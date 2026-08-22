import { fuzzySearch } from 'levenshtein-search';
import type { Highlight, TextSegment } from '../types/library';

/**
 * Converts a color name or hex code to an RGBA string with the given alpha.
 */
function colorToRgba(color: string, alpha: number): string {
  const namedColors: Record<string, string> = {
    yellow: '255, 255, 0',
    lime: '0, 255, 0',
    red: '255, 0, 0',
    blue: '0, 0, 255',
    green: '0, 128, 0',
    orange: '255, 165, 0',
    purple: '128, 0, 128',
    cyan: '0, 255, 255',
    magenta: '255, 0, 255',
  };

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    let r, g, b;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgb = namedColors[color.toLowerCase()] || '128, 128, 128'; // Default gray if unknown
  return `rgba(${rgb}, ${alpha})`;
}

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
    
    let mixedColor: string | undefined = undefined;
    if (activeHighlights.length > 0) {
      // Use multiple linear-gradients to mix colors via CSS multiple backgrounds
      mixedColor = activeHighlights
        .map(h => {
          const rgba = colorToRgba(h.color, 0.4);
          return `linear-gradient(${rgba}, ${rgba})`;
        })
        .join(', ');
    }

    segments.push({ start, end, highlights: activeHighlights, mixedColor });
  }
  
  return segments;
}

/**
 * Searches for a fragment in a text, potentially split by ellipsis (... or …).
 * Returns an array of highlights, one for each part of the split fragment.
 */
export function searchForFragments(text: string, fragment: string, color: string): Highlight[] {
  // Split the fragment by ... or unicode …
  const parts = fragment.split(/\.\.\.|\u2026/).map(p => p.trim()).filter(p => p.length > 0);
  const highlights: Highlight[] = [];
  let lastIndex = 0;

  for (const part of parts) {
    // Search in the text starting from the end of the previous match
    const searchArea = text.slice(lastIndex);
    // Use a fuzzy distance of 3, but capped at half the length for very short parts
    const maxDist = Math.min(3, Math.floor(part.length / 2));
    const matches = [...fuzzySearch(part, searchArea, maxDist)];

    if (matches.length > 0) {
      // Find the best match (lowest distance) in the current search area
      const best = matches.sort((a, b) => a.dist - b.dist)[0];
      
      highlights.push({
        start: lastIndex + best.start,
        end: lastIndex + best.end,
        color: color,
        distance: best.dist
      });
      
      // Update lastIndex to ensure sequential searching
      lastIndex += best.end;
    }
  }

  return highlights;
}
