import { describe, it, expect } from 'vitest';
import {
  buildSectionTrail,
  elideTrail,
  fitSiblingWindow,
  siblingBudgetChars,
  siblingLabel,
  visibleSiblings,
} from './sectionTrail';
import { SECTION_TRAIL } from '../config/sectionTrail';
import type { Section } from '../types/library';

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: 1,
    path_id: '1',
    path_full: 'bk.1',
    path_coded: undefined,
    title_text: 'Untitled',
    order_key: 1,
    level_type: 'chapter',
    subsections: null,
    ...overrides,
  } as unknown as Section;
}

/** A row of siblings under one parent, numbered 1..count. */
function makeSiblings(count: number, parentPath = 'bk', overrides: Partial<Section> = {}): Section[] {
  return Array.from({ length: count }, (_, i) =>
    makeSection({
      id: i + 1,
      path_id: String(i + 1),
      path_full: `${parentPath}.${i + 1}`,
      title_text: `Kapitel ${i + 1}`,
      order_key: i + 1,
      ...overrides,
    }),
  );
}

/** Labels of a window, with the current one marked, e.g. "1 2 [3] 4". */
function shape(window: ReturnType<typeof fitSiblingWindow>): string {
  return window.items.map(i => (i.isCurrent ? `[${i.label}]` : i.label)).join(' ');
}

describe('siblingLabel', () => {
  it("takes path_coded's last dot-segment when it has one", () => {
    expect(siblingLabel(makeSection({ path_coded: 'prolog.1.2' }), 0)).toBe('2');
  });

  it('falls back to path_id when path_coded is missing, empty or trailing-dot', () => {
    expect(siblingLabel(makeSection({ path_coded: undefined, path_id: '7' }), 0)).toBe('7');
    expect(siblingLabel(makeSection({ path_coded: '', path_id: '7' }), 0)).toBe('7');
    expect(siblingLabel(makeSection({ path_coded: '   ', path_id: '7' }), 0)).toBe('7');
    expect(siblingLabel(makeSection({ path_coded: 'prolog.', path_id: '7' }), 0)).toBe('7');
  });

  it('falls back to the ordinal only when path_id is empty too', () => {
    expect(siblingLabel(makeSection({ path_coded: undefined, path_id: '' }), 4)).toBe('5');
    expect(siblingLabel(makeSection({ path_coded: undefined, path_id: undefined }), 0)).toBe('1');
  });

  it('never returns a blank label, even for a mixed list', () => {
    const mixed = [
      makeSection({ path_coded: 'prolog.1.1', path_id: '1' }),
      makeSection({ path_coded: undefined, path_id: '2' }),
      makeSection({ path_coded: '', path_id: '' }),
    ];
    const labels = mixed.map((s, i) => siblingLabel(s, i));
    expect(labels).toEqual(['1', '2', '3']);
    labels.forEach(l => expect(l.trim()).not.toBe(''));
  });
});

describe('visibleSiblings', () => {
  it('drops nodes the table of contents would skip', () => {
    const siblings = makeSiblings(3);
    siblings[1].level_type = null;
    const visible = visibleSiblings(siblings, siblings[0]);
    expect(visible.map(s => s.path_full)).toEqual(['bk.1', 'bk.3']);
  });

  it('keeps the list unfiltered rather than lose the current section', () => {
    const siblings = makeSiblings(3);
    siblings[1].level_type = null;
    const visible = visibleSiblings(siblings, siblings[1]);
    expect(visible).toHaveLength(3);
  });
});

describe('buildSectionTrail', () => {
  // bk > bk.2 ("Del 2") > bk.2.3 ("Kapitel 3"), with siblings at both levels.
  function makeTree(): Section {
    const parts = makeSiblings(4, 'bk', { title_text: 'Del' });
    const chapters = makeSiblings(5, 'bk.2');
    parts[1].subsections = chapters;
    return makeSection({ path_full: 'bk', subsections: parts });
  }

  it('collects every level with its siblings and the current index', () => {
    const trail = buildSectionTrail(makeTree(), 'bk.2.3');
    expect(trail.map(l => l.section.path_full)).toEqual(['bk.2', 'bk.2.3']);
    expect(trail[0].siblings).toHaveLength(4);
    expect(trail[0].currentIndex).toBe(1);
    expect(trail[1].siblings).toHaveLength(5);
    expect(trail[1].currentIndex).toBe(2);
  });

  it('stops at the deepest level it can match instead of throwing', () => {
    const trail = buildSectionTrail(makeTree(), 'bk.2.3.9.4');
    expect(trail.map(l => l.section.path_full)).toEqual(['bk.2', 'bk.2.3']);
  });

  it('returns nothing for an absent tree or an empty path', () => {
    expect(buildSectionTrail(null, 'bk.2')).toEqual([]);
    expect(buildSectionTrail(makeTree(), '')).toEqual([]);
  });

  it('does not confuse a sibling whose path is a string prefix of another', () => {
    // bk.1 and bk.12 share a prefix; only a dot boundary may match.
    const parts = [
      makeSection({ path_full: 'bk.1', path_id: '1' }),
      makeSection({ path_full: 'bk.12', path_id: '12', subsections: makeSiblings(2, 'bk.12') }),
    ];
    const trail = buildSectionTrail(makeSection({ path_full: 'bk', subsections: parts }), 'bk.12.1');
    expect(trail.map(l => l.section.path_full)).toEqual(['bk.12', 'bk.12.1']);
  });

  it('applies the table-of-contents skip rule to each level', () => {
    const parts = makeSiblings(4, 'bk');
    parts[0].level_type = null;
    parts[1].subsections = makeSiblings(3, 'bk.2');
    const trail = buildSectionTrail(makeSection({ path_full: 'bk', subsections: parts }), 'bk.2');
    expect(trail[0].siblings.map(s => s.path_full)).toEqual(['bk.2', 'bk.3', 'bk.4']);
    expect(trail[0].currentIndex).toBe(0);
  });
});

describe('siblingBudgetChars', () => {
  it('gives a longer title a wider budget', () => {
    const short = siblingBudgetChars('Prolog');
    const long = siblingBudgetChars('Kapitel 2: Frankrig, regentskabet');
    expect(long).toBeGreaterThan(short);
  });

  it('floors a short title so its strip is still worth clicking', () => {
    expect(siblingBudgetChars('I')).toBe(siblingBudgetChars('a'.repeat(SECTION_TRAIL.minTitleChars)));
    expect(siblingBudgetChars('')).toBeGreaterThan(0);
  });

  it('caps a long title at the block width, which is where ellipsis takes over', () => {
    const atCap = siblingBudgetChars('a'.repeat(SECTION_TRAIL.maxTitleChars));
    expect(siblingBudgetChars('a'.repeat(SECTION_TRAIL.maxTitleChars * 3))).toBe(atCap);
  });
});

describe('fitSiblingWindow', () => {
  it('shows every sibling when the budget covers them, with both chevrons inert', () => {
    const siblings = makeSiblings(4);
    const window = fitSiblingWindow(siblings, 1, { budgetChars: 100 });
    expect(shape(window)).toBe('1 [2] 3 4');
    expect(window.hasPrev).toBe(false);
    expect(window.hasNext).toBe(false);
  });

  it('anchors at the first sibling for an early chapter in a narrow budget', () => {
    const window = fitSiblingWindow(makeSiblings(10), 1, { budgetChars: 8, minSiblings: 1 });
    expect(window.start).toBe(0);
    expect(shape(window)).toBe('1 [2] 3 4');
    expect(window.hasPrev).toBe(false);
    expect(window.hasNext).toBe(true);
  });

  it('centres the window for a middle chapter in a narrow budget', () => {
    const window = fitSiblingWindow(makeSiblings(20), 9, { budgetChars: 14, minSiblings: 1 });
    expect(shape(window)).toBe('8 9 [10] 11 12');
    expect(window.hasPrev).toBe(true);
    expect(window.hasNext).toBe(true);
  });

  it('anchors at the last sibling for a late chapter', () => {
    const window = fitSiblingWindow(makeSiblings(10), 9, { budgetChars: 8, minSiblings: 1 });
    expect(window.end).toBe(9);
    expect(window.hasNext).toBe(false);
    expect(window.hasPrev).toBe(true);
  });

  it('leans forward when a budget leaves an odd slot', () => {
    // Four slots around index 5: one back, two forward rather than the reverse.
    const window = fitSiblingWindow(makeSiblings(20), 5, { budgetChars: 8, minSiblings: 1 });
    expect(shape(window)).toBe('5 [6] 7 8');
  });

  it('seats minSiblings even when the budget cannot pay for them', () => {
    const window = fitSiblingWindow(makeSiblings(10), 5, { budgetChars: 1, minSiblings: 1 });
    expect(shape(window)).toBe('5 [6] 7');
  });

  it('shows the current section alone when it has no siblings', () => {
    const window = fitSiblingWindow(makeSiblings(1), 0, { budgetChars: 100, minSiblings: 1 });
    expect(shape(window)).toBe('[1]');
    expect(window.hasPrev).toBe(false);
    expect(window.hasNext).toBe(false);
  });

  it('returns an empty window for an empty level', () => {
    const window = fitSiblingWindow([], 0, { budgetChars: 100 });
    expect(window.items).toEqual([]);
    expect(window.hasPrev).toBe(false);
    expect(window.hasNext).toBe(false);
  });

  it('slides with offset without moving which item is current', () => {
    const siblings = makeSiblings(20);
    const base = fitSiblingWindow(siblings, 9, { budgetChars: 14, minSiblings: 1 });
    const slid = fitSiblingWindow(siblings, 9, { budgetChars: 14, minSiblings: 1, offset: 3 });
    expect(slid.start).toBeGreaterThan(base.start);
    expect(slid.items.some(i => i.isCurrent)).toBe(false);
    // Four items, not five: every label out here is two characters wide, where the
    // unslid window still had single-digit neighbours to spend the budget on.
    expect(shape(slid)).toBe('12 13 14 15');
  });

  it('clamps a slide at either end of the sibling list', () => {
    const siblings = makeSiblings(10);
    const far = fitSiblingWindow(siblings, 5, { budgetChars: 8, minSiblings: 1, offset: 999 });
    expect(far.end).toBe(9);
    expect(far.hasNext).toBe(false);
    const back = fitSiblingWindow(siblings, 5, { budgetChars: 8, minSiblings: 1, offset: -999 });
    expect(back.start).toBe(0);
    expect(back.hasPrev).toBe(false);
  });

  it('costs wide labels against the budget, so fewer of them fit', () => {
    const narrow = makeSiblings(20);
    const wide = makeSiblings(20).map((s, i) => ({ ...s, path_id: `kapitel-${i + 1}` }));
    const a = fitSiblingWindow(narrow, 9, { budgetChars: 20, minSiblings: 0 });
    const b = fitSiblingWindow(wide, 9, { budgetChars: 20, minSiblings: 0 });
    expect(b.items.length).toBeLessThan(a.items.length);
  });

  it('survives a current index outside the sibling list', () => {
    const window = fitSiblingWindow(makeSiblings(3), 99, { budgetChars: 100 });
    expect(window.items).toHaveLength(3);
    expect(window.start).toBe(0);
  });
});

describe('elideTrail', () => {
  function makeLevels(count: number) {
    return makeSiblings(count).map(section => ({ section, siblings: [section], currentIndex: 0 }));
  }

  it('keeps everything when the trail is short enough', () => {
    const { elidable, kept } = elideTrail(makeLevels(3), 3);
    expect(elidable).toEqual([]);
    expect(kept).toHaveLength(3);
  });

  it('marks the outermost levels elidable and keeps the tail', () => {
    const { elidable, kept } = elideTrail(makeLevels(5), 2);
    expect(elidable.map(l => l.section.path_full)).toEqual(['bk.1', 'bk.2', 'bk.3']);
    expect(kept.map(l => l.section.path_full)).toEqual(['bk.4', 'bk.5']);
  });

  it('always keeps at least the current level', () => {
    const { kept } = elideTrail(makeLevels(4), 0);
    expect(kept.map(l => l.section.path_full)).toEqual(['bk.4']);
  });
});
