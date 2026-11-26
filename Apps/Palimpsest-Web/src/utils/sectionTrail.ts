import type { Section } from '../types/library';
import { SECTION_TRAIL, type SectionTrailConfig } from '../config/sectionTrail';

/**
 * The arithmetic behind the nav bar's section trail: the ancestor chain, each level's
 * sibling list, and how many of those siblings fit under a title of a given length.
 *
 * Kept free of store, router and component access so it can be unit-tested directly,
 * in the manner of utils/bookGrouping.ts. Width is estimated in characters rather than
 * measured in pixels: nothing in this app observes element size, and a character
 * budget is the house approach to fitting text into a fixed space (see condenseQuotes
 * in utils/text.ts).
 */

/** One rung of the trail: a section, the siblings it sits among, and where among them. */
export interface TrailLevel {
  section: Section;
  /** The level's siblings in document order, including `section` itself. */
  siblings: Section[];
  /** Index of `section` within `siblings`. -1 only if the tree is inconsistent. */
  currentIndex: number;
}

export interface SiblingWindowItem {
  section: Section;
  /** Already-resolved display label; never empty. */
  label: string;
  isCurrent: boolean;
}

export interface SiblingWindow {
  items: SiblingWindowItem[];
  /** First and last sibling index in the window, inclusive. */
  start: number;
  end: number;
  /** Whether siblings exist outside the window, i.e. whether a chevron can slide. */
  hasPrev: boolean;
  hasNext: boolean;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * The shortest sensible name for a section.
 *
 * path_coded's last dot-segment is the nicest of these ("prolog.1.2" -> "2"), but the
 * field is optional and is not guaranteed to be populated per node even on a request
 * that asked for it, so it is treated as a nicety over a path_id baseline. Each step
 * tests for a non-empty string rather than for presence, which makes a missing field,
 * an empty one and a trailing-dot path ("prolog.") all fall through alike. A label
 * must never come back blank: an empty one would turn a sibling into an unclickable
 * gap in the strip.
 */
export function siblingLabel(section: Section, index: number): string {
  const coded = section.path_coded?.split('.').pop()?.trim();
  if (coded) return coded;
  const id = section.path_id?.trim();
  if (id) return id;
  return String(index + 1);
}

/**
 * The siblings worth showing at one level.
 *
 * A falsy level_type marks a node the table of contents skips (see walkTree in
 * TableOfContents.vue), so the strip skips it too and the two stay numbered alike.
 * If that filter would discard the very section we are standing on, the unfiltered
 * list is returned instead - losing the anchor is worse than showing an odd node.
 */
export function visibleSiblings(subsections: Section[], current: Section): Section[] {
  const visible = subsections.filter(s => !!s.level_type);
  const keptCurrent = visible.some(s => s.path_full === current.path_full);
  return keptCurrent ? visible : subsections;
}

/**
 * Walks the loaded book tree down to `sectionPathFull`, collecting each level's
 * section together with its siblings.
 *
 * Descends by path_full the way findPath in TableOfContents.vue does, rather than by
 * splitting the route path and matching path_id per segment: the parent node is in
 * hand at every step, so its subsections array is the sibling list and needs no second
 * lookup. A path that cannot be matched all the way down yields the levels resolved so
 * far instead of throwing, which is what a tree fetched at a shallower depth than the
 * route asks for will produce.
 */
export function buildSectionTrail(tree: Section | null | undefined, sectionPathFull: string): TrailLevel[] {
  const levels: TrailLevel[] = [];
  if (!tree || !sectionPathFull) return levels;

  let node: Section | null = tree;
  while (node?.subsections?.length) {
    const next: Section | undefined = node.subsections.find(
      s => s.path_full === sectionPathFull || sectionPathFull.startsWith(s.path_full + '.'),
    );
    if (!next) break;

    const siblings = visibleSiblings(node.subsections, next);
    levels.push({
      section: next,
      siblings,
      currentIndex: siblings.findIndex(s => s.path_full === next.path_full),
    });

    if (next.path_full === sectionPathFull) break;
    node = next;
  }

  return levels;
}

/**
 * How many characters the sibling strip may spend, given the title above it.
 *
 * The title governs the block's width, so it governs the strip: a long title buys a
 * wider window, a short one a narrower. Two corrections apply. The sub row is set in a
 * smaller size, so proportionally more characters fit in the same width. And a floor
 * under the title length keeps a block titled "Prolog" from earning a strip with no
 * room for any sibling at all - such a block is allowed to grow a little past its own
 * title rather than carry a useless strip.
 */
export function siblingBudgetChars(title: string, config: SectionTrailConfig = SECTION_TRAIL): number {
  const titleChars = clamp((title ?? '').trim().length, config.minTitleChars, config.maxTitleChars);
  // Each chevron costs its glyph plus the gap that separates it from the labels.
  const chromeChars = config.markerStyle === 'chevron-ends' ? 4 : 0;
  return Math.max(1, Math.floor(titleChars * config.subRowCharRatio - chromeChars));
}

/**
 * Picks the run of siblings to show around the current one.
 *
 * Grows outward from an anchor, one item per side per round, taking the later sibling
 * before the earlier one so that an odd number of slots leans forward - reading on
 * matters more than reading back. Clamping at either end of the list is what produces
 * the three shapes the strip needs, with no special-casing by position:
 *
 *   - a budget that covers everything       -> every sibling, both chevrons inert
 *   - a narrow budget near the start        -> 1 2 [3] 4, anchored at the first
 *   - a narrow budget in the middle         -> -2 -1 [current] +1 +2, centred
 *
 * `offset` slides the anchor off the current section, which is how the chevrons move
 * the window without navigating. `minSiblings` is seated before the budget is
 * consulted, so a starving budget still yields a strip worth clicking.
 */
export function fitSiblingWindow(
  siblings: Section[],
  currentIndex: number,
  options: {
    budgetChars: number;
    offset?: number;
    minSiblings?: number;
    separatorChars?: number;
  },
): SiblingWindow {
  const n = siblings.length;
  if (n === 0) {
    return { items: [], start: 0, end: -1, hasPrev: false, hasNext: false };
  }

  const budget = options.budgetChars;
  const minSiblings = Math.max(0, options.minSiblings ?? 0);
  const separator = options.separatorChars ?? 1;

  const labels = siblings.map((s, i) => siblingLabel(s, i));
  const cost = (i: number) => labels[i].length + separator;

  const safeCurrent = clamp(currentIndex, 0, n - 1);
  const anchor = clamp(safeCurrent + (options.offset ?? 0), 0, n - 1);

  let start = anchor;
  let end = anchor;
  let used = cost(anchor);

  // Seated regardless of budget: see minSiblings.
  for (let k = 0; k < minSiblings; k++) {
    if (end + 1 < n) used += cost(++end);
    if (start - 1 >= 0) used += cost(--start);
  }

  // Then outward while the budget holds, one per side per round so the window stays
  // centred instead of running to one end first.
  for (;;) {
    let grew = false;
    if (end + 1 < n && used + cost(end + 1) <= budget) {
      used += cost(++end);
      grew = true;
    }
    if (start - 1 >= 0 && used + cost(start - 1) <= budget) {
      used += cost(--start);
      grew = true;
    }
    if (!grew) break;
  }

  const items: SiblingWindowItem[] = [];
  for (let i = start; i <= end; i++) {
    items.push({ section: siblings[i], label: labels[i], isCurrent: i === currentIndex });
  }

  return { items, start, end, hasPrev: start > 0, hasNext: end < n - 1 };
}

/**
 * Splits the trail into the levels that may be collapsed away when the nav bar is
 * narrow and the levels that must survive.
 *
 * Which of the two is actually shown is decided in CSS by a container query on the nav
 * portal, so both are rendered; this only says which is which, and supplies the text
 * the collapsed block reveals on hover. The tail is kept because the current section
 * and its parent are the levels a reader is navigating between.
 */
export function elideTrail(
  levels: TrailLevel[],
  maxLevels: number = SECTION_TRAIL.maxLevels,
): { elidable: TrailLevel[]; kept: TrailLevel[] } {
  const keep = Math.max(1, maxLevels);
  if (levels.length <= keep) return { elidable: [], kept: levels };
  return { elidable: levels.slice(0, levels.length - keep), kept: levels.slice(levels.length - keep) };
}
