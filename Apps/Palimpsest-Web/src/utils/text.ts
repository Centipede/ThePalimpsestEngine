import { fuzzySearch } from 'levenshtein-search';
import type { Highlight, TextSegment } from '../types/library';

/**
 * Converts RGB to HSL.
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

/**
 * Converts HSL to RGB.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Adjusts a color's lightness for the current theme while preserving hue and saturation.
 */
function adjustColorForTheme(r: number, g: number, b: number, isDark: boolean): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b);
  // Targeted Lightness Range:
  // Dark Mode: map to 15-35%
  // Light Mode: clamp to 65-95%
  const newL = isDark
      ? 15 + (l / 100) * 20
      : Math.min(95, Math.max(65, l));

  return hslToRgb(h, s, newL);
}

/**
 * Converts a color name or hex code to an RGBA string with the given alpha,
 * adjusted for the active theme.
 */
function colorToRgba(color: string, alpha: number, isDark: boolean = false): string {
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

  let r, g, b;

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else {
    const rgbStr = namedColors[color.toLowerCase()] || '128, 128, 128';
    [r, g, b] = rgbStr.split(',').map(n => parseInt(n.trim(), 10));
  }

  const [ar, ag, ab] = adjustColorForTheme(r, g, b, isDark);
  return `rgba(${ar}, ${ag}, ${ab}, ${alpha})`;
}

/**
 * Decomposes text into non-overlapping segments based on highlight ranges.
 * The resulting segments cover the entire text from 0 to text.length.
 */
export function computeSegments(text: string, highlights: Highlight[], isDark: boolean = false): TextSegment[] {
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
          const rgba = colorToRgba(h.color, isDark ? 0.4 : 0.6, isDark);
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
