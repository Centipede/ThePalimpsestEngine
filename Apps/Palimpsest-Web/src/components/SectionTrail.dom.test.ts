// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import SectionTrail from './SectionTrail.vue';
import type { Section } from '../types/library';
import type { TrailLevel } from '../utils/sectionTrail';

/**
 * What the markup does with a trail, as opposed to what the arithmetic decides - that
 * is covered in utils/sectionTrail.test.ts. The things checked here are the ones a
 * look at the real nav bar would check: that the current section is marked and the
 * others are not, that a chevron slides the strip instead of navigating, that a
 * chevron goes inert at the end of a level, and that the hrefs point at sections.
 */

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: 1,
    path_id: '1',
    path_full: 'bk.1',
    title_text: 'Untitled',
    order_key: 1,
    level_type: 'chapter',
    subsections: null,
    ...overrides,
  } as unknown as Section;
}

/** One level of `count` siblings, standing on the `current`th (0-based). */
function makeLevel(count: number, current: number, parentPath = 'bk', title = 'Kapitel'): TrailLevel {
  const siblings = Array.from({ length: count }, (_, i) =>
    makeSection({
      id: i + 1,
      path_id: String(i + 1),
      path_full: `${parentPath}.${i + 1}`,
      title_text: `${title} ${i + 1}`,
    }),
  );
  return { section: siblings[current], siblings, currentIndex: current };
}

function mountTrail(levels: TrailLevel[]) {
  return mount(SectionTrail, {
    props: { levels, machineName: 'a-book' },
    global: {
      plugins: [
        createRouter({
          history: createMemoryHistory(),
          routes: [
            { path: '/', component: { template: '<div />' } },
            { path: '/study/:machine_name/section/:path_full', component: { template: '<div />' } },
          ],
        }),
      ],
      config: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith('sl-') } },
    },
  });
}

const CURRENT_MARKER = '●';

describe('SectionTrail', () => {
  it('renders one block per level, titled by the section', () => {
    const wrapper = mountTrail([makeLevel(4, 1, 'bk', 'Del'), makeLevel(5, 2, 'bk.2')]);
    const titles = wrapper.findAll('.trail__title').map(t => t.text());
    expect(titles).toEqual(['Del 2', 'Kapitel 3']);
  });

  it('renders nothing at all when there is no trail', () => {
    expect(mountTrail([]).find('.trail').exists()).toBe(false);
  });

  it('marks the current sibling and leaves the rest as plain labels', () => {
    const wrapper = mountTrail([makeLevel(4, 1)]);
    const strip = wrapper.findAll('.trail__sibling').map(s => s.text());
    expect(strip).toEqual(['1', CURRENT_MARKER, '3', '4']);

    const current = wrapper.find('.trail__sibling--current');
    expect(current.attributes('aria-current')).toBe('page');
    // The number is gone from the glyph but kept for anyone reading the label.
    expect(current.attributes('aria-label')).toBe('Kapitel 2');
  });

  it('points each sibling at its own section', () => {
    const wrapper = mountTrail([makeLevel(3, 0)]);
    const hrefs = wrapper.findAll('.trail__sibling').map(s => s.attributes('href'));
    expect(hrefs).toEqual([
      '/study/a-book/section/bk.1',
      '/study/a-book/section/bk.2',
      '/study/a-book/section/bk.3',
    ]);
  });

  it('shows a lone marker for a level with no siblings, both chevrons inert', () => {
    const wrapper = mountTrail([makeLevel(1, 0)]);
    expect(wrapper.findAll('.trail__sibling').map(s => s.text())).toEqual([CURRENT_MARKER]);
    const chevrons = wrapper.findAll('.trail__chevron');
    expect(chevrons).toHaveLength(2);
    chevrons.forEach(c => expect(c.attributes('disabled')).toBeDefined());
  });

  it('slides the window on a chevron click without navigating', async () => {
    // A short title keeps the budget tight, so the window is narrower than the level.
    const wrapper = mountTrail([makeLevel(12, 5, 'bk', 'K')]);
    const before = wrapper.findAll('.trail__sibling').map(s => s.text());
    expect(before).toContain(CURRENT_MARKER);

    const next = wrapper.findAll('.trail__chevron')[1];
    await next.trigger('click');

    const after = wrapper.findAll('.trail__sibling').map(s => s.text());
    expect(after).not.toEqual(before);
    // Sliding is a glance sideways: the route is untouched.
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/');
  });

  it('disables the backward chevron at the start and the forward one at the end', async () => {
    const wrapper = mountTrail([makeLevel(12, 0, 'bk', 'K')]);
    const [prev, next] = wrapper.findAll('.trail__chevron');
    expect(prev.attributes('disabled')).toBeDefined();
    expect(next.attributes('disabled')).toBeUndefined();

    // Walk the window to the far end; the clamp means extra clicks cost nothing.
    for (let i = 0; i < 20; i++) await wrapper.findAll('.trail__chevron')[1].trigger('click');

    const [prevEnd, nextEnd] = wrapper.findAll('.trail__chevron');
    expect(prevEnd.attributes('disabled')).toBeUndefined();
    expect(nextEnd.attributes('disabled')).toBeDefined();
  });

  it('recentres every level when the trail changes', async () => {
    const level = makeLevel(12, 5, 'bk', 'K');
    const wrapper = mountTrail([level]);
    // One step per click, so the current section only leaves a three-wide window on
    // the third: sliding is meant to feel like edging sideways, not jumping.
    for (let i = 0; i < 3; i++) await wrapper.findAll('.trail__chevron')[1].trigger('click');
    expect(wrapper.findAll('.trail__sibling').map(s => s.text())).not.toContain(CURRENT_MARKER);

    await wrapper.setProps({ levels: [makeLevel(12, 7, 'bk', 'K')] });
    expect(wrapper.findAll('.trail__sibling').map(s => s.text())).toContain(CURRENT_MARKER);
  });

  it('gives a longer title room for more siblings than a short one', () => {
    const short = mountTrail([makeLevel(20, 10, 'bk', 'K')]);
    const long = mountTrail([makeLevel(20, 10, 'bk', 'Kapitel om Frankrig')]);
    expect(long.findAll('.trail__sibling').length).toBeGreaterThan(
      short.findAll('.trail__sibling').length,
    );
  });

  it('marks the outer levels elidable and offers a collapsed stand-in', () => {
    const levels = [
      makeLevel(2, 0, 'bk', 'Bind'),
      makeLevel(2, 0, 'bk.1', 'Del'),
      makeLevel(2, 0, 'bk.1.1', 'Kapitel'),
      makeLevel(2, 0, 'bk.1.1.1', 'Afsnit'),
    ];
    const wrapper = mountTrail(levels);
    // maxLevels is 3, so only the outermost of four may be collapsed away.
    expect(wrapper.findAll('.trail__block--elidable')).toHaveLength(1);
    expect(wrapper.find('.trail__block--elided').attributes('title')).toBe('Bind 1');
  });

  it('offers no collapsed stand-in when the trail is short enough', () => {
    const wrapper = mountTrail([makeLevel(2, 0, 'bk', 'Del'), makeLevel(2, 0, 'bk.1')]);
    expect(wrapper.find('.trail__block--elided').exists()).toBe(false);
    expect(wrapper.findAll('.trail__block--elidable')).toHaveLength(0);
  });

  it('honours a config override', () => {
    const wrapper = mount(SectionTrail, {
      props: { levels: [makeLevel(4, 1)], machineName: 'a-book', config: { markerStyle: 'boxed-current' } },
      global: {
        plugins: [
          createRouter({
            history: createMemoryHistory(),
            routes: [
            { path: '/', component: { template: '<div />' } },
            { path: '/study/:machine_name/section/:path_full', component: { template: '<div />' } },
          ],
          }),
        ],
        config: { compilerOptions: { isCustomElement: (tag: string) => tag.startsWith('sl-') } },
      },
    });
    // boxed-current keeps the number and drops the chevrons.
    expect(wrapper.findAll('.trail__sibling').map(s => s.text())).toEqual(['1', '2', '3', '4']);
    expect(wrapper.find('.trail__sibling--boxed').exists()).toBe(true);
    expect(wrapper.findAll('.trail__chevron')).toHaveLength(0);
  });
});
