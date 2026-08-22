declare module 'levenshtein-search' {
  export interface FuzzySearchMatch {
    start: number;
    end: number;
    dist: number;
  }

  export function fuzzySearch(
      pattern: string,
      text: string,
      maxDist?: number
  ): Iterable<FuzzySearchMatch>;
}
