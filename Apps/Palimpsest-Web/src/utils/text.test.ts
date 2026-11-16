import { describe, it, expect } from 'vitest';
import { computeSegments, condenseQuotes, searchForFragments } from './text';
import type { Highlight } from '../types/library';

describe('computeSegments color mixing', () => {
  it('correctly calculates mixedColor for overlapping highlights in light mode', () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    const highlights: Highlight[] = [
      { start: 4, end: 15, color: 'red', distance: 0 }, // "quick brown"
      { start: 10, end: 20, color: 'blue', distance: 0 }, // "brown fox j"
    ];

    const segments = computeSegments(text, highlights, false);

    // Segment 1: "quick " [4, 10] - red adjusted for light mode
    expect(segments[1].mixedColor).toBe('linear-gradient(rgba(255, 77, 77, 0.6), rgba(255, 77, 77, 0.6))');

    // Segment 2: "brown" [10, 15] - red + blue adjusted for light mode
    expect(segments[2].mixedColor).toContain('linear-gradient(rgba(255, 77, 77, 0.6), rgba(255, 77, 77, 0.6)), linear-gradient(rgba(77, 77, 255, 0.6), rgba(77, 77, 255, 0.6))');
    expect(segments[2].mixedColor).toContain('linear-gradient(rgba(255, 77, 77, 0.6), rgba(255, 77, 77, 0.6)), linear-gradient(rgba(77, 77, 255, 0.6), rgba(77, 77, 255, 0.6))');
  });

  it('correctly calculates mixedColor for dark mode', () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    const highlights: Highlight[] = [
      { start: 4, end: 15, color: 'red', distance: 0 },
    ];

    const segments = computeSegments(text, highlights, true);
    
    // Segment 1: red adjusted for dark mode
    expect(segments[1].mixedColor).toBe('linear-gradient(rgba(128, 0, 0, 0.4), rgba(128, 0, 0, 0.4))');
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

describe('condenseQuotes', () => {
  it('joins quotes with a middot separator', () => {
    const line = condenseQuotes([{ quote: 'alpha' }, { quote: 'beta' }]);
    expect(line).toBe('alpha \u00b7 beta');
  });

  it('skips empty, whitespace-only and missing quotes', () => {
    const line = condenseQuotes([{ quote: '' }, { quote: '   ' }, { quote: null }, {}, { quote: 'real' }]);
    expect(line).toBe('real');
  });

  it('collapses internal whitespace so a wrapped quote stays on one line', () => {
    expect(condenseQuotes([{ quote: ' a\n  b\tc ' }])).toBe('a b c');
  });

  it('truncates a single over-long quote', () => {
    const line = condenseQuotes([{ quote: 'x'.repeat(80) }], { maxEach: 10 });
    expect(line).toBe('x'.repeat(9) + '\u2026');
  });

  it('stays within the total budget', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ quote: `quote number ${i}` }));
    expect(condenseQuotes(many, { maxTotal: 40 }).length).toBeLessThanOrEqual(40);
  });

  it('does not let one long quote crowd out the rest', () => {
    const line = condenseQuotes([{ quote: 'y'.repeat(200) }, { quote: 'second' }], { maxEach: 12, maxTotal: 140 });
    expect(line).toContain('second');
  });

  it('returns an empty string for no occurrences', () => {
    expect(condenseQuotes([])).toBe('');
  });
});
