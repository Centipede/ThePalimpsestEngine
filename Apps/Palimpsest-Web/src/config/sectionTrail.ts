/**
 * Presentation choices for the section trail in the nav bar.
 *
 * The trail renders one small block per ancestor level: the section title on top, a
 * windowed strip of that level's siblings underneath. Everything about how that strip
 * looks is gathered here rather than spread through SectionTrail.vue, because the
 * glyphs and the width heuristics are the parts most likely to be rewritten once the
 * trail has been lived with for a while.
 */

/**
 * How the sibling strip signals which way is backward and which way is forward.
 *
 * - `chevron-ends`  - one chevron at each end of the window; they slide the window
 *                     rather than navigate, so direction is shown once instead of
 *                     once per item. The default.
 * - `per-item-arrow`- every sibling carries its own arrow. Legible without hovering,
 *                     but each item costs 2-3 more characters, so roughly a third
 *                     fewer siblings fit in the same width.
 * - `bare`          - labels only; position either side of the current marker is the
 *                     only cue. The quietest, and the widest window per rem.
 * - `boxed-current` - like `bare`, but the current section is boxed instead of being
 *                     given a marker glyph, so the strip reads as a row of page tabs.
 */
export type TrailMarkerStyle = 'chevron-ends' | 'per-item-arrow' | 'bare' | 'boxed-current';

/** The glyphs the strip is drawn with. Single characters keep the width budget honest. */
export interface TrailMarkers {
  /** Backward end of the window, and the per-item arrow for earlier siblings. */
  prev: string;
  /** Forward end of the window, and the per-item arrow for later siblings. */
  next: string;
  /** Marks the section you are actually on. Unused by `boxed-current`. */
  current: string;
  /** Stands in for trail levels collapsed away when the nav is too narrow. */
  elided: string;
}

export interface SectionTrailConfig {
  markerStyle: TrailMarkerStyle;
  markers: TrailMarkers;
  /**
   * Siblings kept either side of the current one even when the title is too short to
   * pay for them. Without a floor, a level titled "Prolog" earns a strip of just the
   * current marker, which is worse than slightly overflowing its title's width.
   */
  minSiblings: number;
  /**
   * How many items a chevron click moves the window. 1 is predictable and matches the
   * one-at-a-time feel of the strip; a window-sized step covers ground faster but
   * makes it easy to lose track of where the current section went.
   */
  slideStep: number;
  /**
   * Trail levels shown before the middle ones collapse into a single elided block.
   * The current level and its parent are always among those kept, so this is really
   * "how many ancestors above the parent survive".
   */
  maxLevels: number;
  /**
   * Shortest title, in characters, that the sibling strip is allowed to budget
   * against. Titles below this still get this much room - see `minSiblings`.
   */
  minTitleChars: number;
  /**
   * Longest title the strip budgets against, matching --nav-block-max-width. A longer
   * title is ellipsized and buys no further room.
   */
  maxTitleChars: number;
  /**
   * How many sub-row characters fit in the width of one title-row character. The sub
   * row is set smaller, so it fits proportionally more: --nav-block-title-size divided
   * by --nav-block-sub-size. Keep in step with those two tokens in style.css.
   */
  subRowCharRatio: number;
}

/**
 * Single source of truth for the trail's look, so SectionTrail.vue holds layout and
 * the width arithmetic holds no magic numbers of its own.
 */
export const SECTION_TRAIL: SectionTrailConfig = {
  markerStyle: 'chevron-ends',
  markers: {
    prev: '‹',
    next: '›',
    current: '●',
    elided: '…',
  },
  minSiblings: 1,
  slideStep: 1,
  maxLevels: 3,
  // Roughly "Prolog": short enough to be common, long enough to seat a few siblings.
  minTitleChars: 8,
  // 9.5rem of Avenir Next at 0.95rem comes to about this many characters.
  maxTitleChars: 22,
  // 0.95rem title row over a 0.68rem sub row.
  subRowCharRatio: 0.95 / 0.68,
};
