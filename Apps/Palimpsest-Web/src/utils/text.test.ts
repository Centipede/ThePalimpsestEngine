import { describe, it, expect } from 'vitest';
import { computeSegments, searchForFragments } from './text';
import type { Highlight } from '../types/library';

describe('computeSegments color mixing', () => {
  it('correctly calculates mixedColor for overlapping highlights', () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    const highlights: Highlight[] = [
      { start: 4, end: 15, color: 'red', distance: 0 }, // "quick brown"
      { start: 10, end: 20, color: 'blue', distance: 0 }, // "brown fox j"
    ];

    const segments = computeSegments(text, highlights);
    
    // Segment 0: "The " [0, 4] - no highlights
    expect(segments[0].start).toBe(0);
    expect(segments[0].end).toBe(4);
    expect(segments[0].highlights).toHaveLength(0);
    expect(segments[0].mixedColor).toBeUndefined();

    // Segment 1: "quick " [4, 10] - red
    expect(segments[1].start).toBe(4);
    expect(segments[1].end).toBe(10);
    expect(segments[1].highlights).toHaveLength(1);
    expect(segments[1].mixedColor).toBe('linear-gradient(rgba(255, 0, 0, 0.4), rgba(255, 0, 0, 0.4))');

    // Segment 2: "brown" [10, 15] - red + blue
    expect(segments[2].start).toBe(10);
    expect(segments[2].end).toBe(15);
    expect(segments[2].highlights).toHaveLength(2);
    expect(segments[2].mixedColor).toContain('linear-gradient(rgba(255, 0, 0, 0.4), rgba(255, 0, 0, 0.4))');
    expect(segments[2].mixedColor).toContain('linear-gradient(rgba(0, 0, 255, 0.4), rgba(0, 0, 255, 0.4))');

    // Segment 3: " fox j" [15, 20] - blue
    expect(segments[3].start).toBe(15);
    expect(segments[3].end).toBe(20);
    expect(segments[3].highlights).toHaveLength(1);
    expect(segments[3].mixedColor).toBe('linear-gradient(rgba(0, 0, 255, 0.4), rgba(0, 0, 255, 0.4))');
  });
});

describe('searchForFragments', () => {
  const text = "The quick brown fox jumps over the lazy dog.";

  it('finds a single part fragment', () => {
    const highlights = searchForFragments(text, "quick brown", "red");
    expect(highlights).toHaveLength(1);
    expect(highlights[0].start).toBe(4);
    expect(highlights[0].end).toBe(15);
    expect(text.slice(highlights[0].start, highlights[0].end)).toBe("quick brown");
  });

  it('finds a multi-part fragment with ...', () => {
    const highlights = searchForFragments(text, "quick ... jumps", "red");
    expect(highlights).toHaveLength(2);
    expect(text.slice(highlights[0].start, highlights[0].end)).toBe("quick");
    expect(text.slice(highlights[1].start, highlights[1].end)).toBe("jumps");
  });

  it('finds a multi-part fragment with unicode …', () => {
    const highlights = searchForFragments(text, "brown … lazy", "blue");
    expect(highlights).toHaveLength(2);
    expect(text.slice(highlights[0].start, highlights[0].end)).toBe("brown");
    expect(text.slice(highlights[1].start, highlights[1].end)).toBe("lazy");
  });

  it('handles fuzzy matching in multi-part fragments', () => {
    // "quck" instead of "quick" (dist 1)
    const highlights = searchForFragments(text, "quck ... fox", "green");
    expect(highlights).toHaveLength(2);
    expect(highlights[0].distance).toBe(1);
    expect(text.slice(highlights[0].start, highlights[0].end)).toBe("quick");
  });

  it('ensures sequential search', () => {
    const doubleText = "apple orange apple banana";
    // Should find the second "apple" after "orange"
    const highlights = searchForFragments(doubleText, "orange ... apple", "red");
    expect(highlights).toHaveLength(2);
    expect(highlights[0].start).toBe(6); // orange
    expect(highlights[1].start).toBe(13); // second apple
  });
});
