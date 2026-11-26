<template>
  <nav v-if="blocks.length" class="trail" aria-label="Section trail">
    <!-- Stands in for the blocks a narrow nav collapses away. Rendered first so that
         DOM order reads correctly whichever of the two the container query reveals. -->
    <div
      v-if="elidedTitle"
      class="trail__block trail__block--elided"
      :title="elidedTitle"
    >
      <span class="trail__title trail__title--elided" aria-hidden="true">{{ cfg.markers.elided }}</span>
      <span class="trail__siblings"></span>
    </div>

    <div
      v-for="block in blocks"
      :key="block.key"
      class="trail__block"
      :class="{ 'trail__block--elidable': block.elidable }"
    >
      <router-link
        :to="sectionRoute(block.level.section.path_full)"
        class="trail__title"
        :title="block.level.section.title_text"
      >{{ block.level.section.title_text }}</router-link>

      <span class="trail__siblings">
        <button
          v-if="cfg.markerStyle === 'chevron-ends'"
          type="button"
          class="trail__chevron"
          :disabled="!block.window.hasPrev"
          aria-label="Show earlier sections at this level"
          title="Show earlier sections at this level"
          @click="slide(block.level, -1)"
        >{{ cfg.markers.prev }}</button>

        <router-link
          v-for="item in block.window.items"
          :key="item.section.path_full"
          :to="sectionRoute(item.section.path_full)"
          class="trail__sibling"
          :class="{
            'trail__sibling--current': item.isCurrent,
            'trail__sibling--boxed': item.isCurrent && cfg.markerStyle === 'boxed-current',
          }"
          :title="item.section.title_text"
          :aria-label="item.section.title_text"
          :aria-current="item.isCurrent ? 'page' : undefined"
        >{{ siblingText(item, block.window) }}</router-link>

        <button
          v-if="cfg.markerStyle === 'chevron-ends'"
          type="button"
          class="trail__chevron"
          :disabled="!block.window.hasNext"
          aria-label="Show later sections at this level"
          title="Show later sections at this level"
          @click="slide(block.level, 1)"
        >{{ cfg.markers.next }}</button>
      </span>
    </div>
  </nav>
</template>

<script setup lang="ts">
/**
 * The ancestor trail in the nav bar, one two-row block per level: the section title on
 * top, a window onto that level's siblings underneath.
 *
 * Presentational on purpose - levels in, routes out, no fetching and no store access -
 * so it mounts in a test without a server, in the manner of worktools/Pager.vue. The
 * sibling lists arrive already gathered from the loaded book tree, so the trail costs
 * no requests of its own.
 *
 * Two different mechanisms decide what fits, because they answer two different
 * questions. How many siblings fit under one title is arithmetic on a character budget
 * (utils/sectionTrail.ts), since the title's width is what bounds the strip. Whether
 * the whole trail fits the nav bar is a question about the portal's width, which CSS
 * can answer by itself through a container query - so no element here is measured in
 * JavaScript.
 */
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import {
  elideTrail,
  fitSiblingWindow,
  siblingBudgetChars,
  type SiblingWindow,
  type SiblingWindowItem,
  type TrailLevel,
} from '../utils/sectionTrail';
import { SECTION_TRAIL, type SectionTrailConfig } from '../config/sectionTrail';

const props = defineProps<{
  levels: TrailLevel[];
  machineName: string;
  /** Overrides for the shipped defaults, per field. */
  config?: Partial<SectionTrailConfig>;
}>();

const cfg = computed<SectionTrailConfig>(() => ({ ...SECTION_TRAIL, ...props.config }));

/**
 * How far each level's window has been slid off the current section, keyed by the
 * level's path. Deliberately not persisted: a slid window is a glance sideways, and
 * coming back to a section later should show it centred again.
 */
const offsets = ref<Record<string, number>>({});

watch(
  () => props.levels.map(l => l.section.path_full).join('|'),
  () => { offsets.value = {}; },
);

const blocks = computed(() => {
  const { elidable } = elideTrail(props.levels, cfg.value.maxLevels);
  const elidableKeys = new Set(elidable.map(l => l.section.path_full));

  return props.levels.map(level => ({
    key: level.section.path_full,
    level,
    elidable: elidableKeys.has(level.section.path_full),
    window: fitSiblingWindow(level.siblings, level.currentIndex, {
      budgetChars: siblingBudgetChars(level.section.title_text, cfg.value),
      offset: offsets.value[level.section.path_full] ?? 0,
      minSiblings: cfg.value.minSiblings,
    }),
  }));
});

/** What the collapsed block reveals on hover, or '' when nothing is collapsed. */
const elidedTitle = computed(() =>
  elideTrail(props.levels, cfg.value.maxLevels)
    .elidable.map(l => l.section.title_text)
    .join(` ${SECTION_TRAIL.markers.next} `),
);

function sectionRoute(pathFull: string) {
  return `/study/${props.machineName}/section/${pathFull}`;
}

/**
 * The glyph or number a sibling shows.
 *
 * Every style but `boxed-current` replaces the current section's number with a marker:
 * the title directly above already names it, so the number would be redundant there,
 * while the marker is what makes the strip readable at a glance. The number stays in
 * the link's title and aria-label either way.
 */
function siblingText(item: SiblingWindowItem, window: SiblingWindow): string {
  if (item.isCurrent) {
    return cfg.value.markerStyle === 'boxed-current' ? item.label : cfg.value.markers.current;
  }
  if (cfg.value.markerStyle !== 'per-item-arrow') return item.label;
  const currentIndex = window.items.findIndex(i => i.isCurrent);
  const position = window.items.indexOf(item);
  // With the current section slid out of the window there is no "before" or "after"
  // to point at, so the arrows are dropped rather than guessed.
  if (currentIndex === -1) return item.label;
  return position < currentIndex
    ? `${cfg.value.markers.prev}${item.label}`
    : `${item.label}${cfg.value.markers.next}`;
}

/**
 * Slides one level's window by a step, without navigating.
 *
 * The stored offset is clamped to the range that can still move the window, so that
 * repeated clicks at an end do not build up a debt the user then has to click back
 * through before anything moves.
 */
function slide(level: TrailLevel, direction: -1 | 1) {
  const key = level.section.path_full;
  const current = offsets.value[key] ?? 0;
  const lowest = -level.currentIndex;
  const highest = level.siblings.length - 1 - level.currentIndex;
  const next = Math.min(highest, Math.max(lowest, current + cfg.value.slideStep * direction));
  offsets.value = { ...offsets.value, [key]: next };
}
</script>

<style scoped>
.trail {
  display: flex;
  align-items: stretch;
  min-width: 0;
  overflow: hidden;
}

/* Two fixed rows, shared with the book block in BookDetailView, so that the title
   rows of every block in the nav portal sit on one line and the sub rows on another
   however their font sizes differ. */
.trail__block {
  display: grid;
  grid-template-rows: var(--nav-block-row1) var(--nav-block-row2);
  align-items: center;
  align-content: center;
  min-width: 0;
  max-width: var(--nav-block-max-width);
  padding: 0 0.6rem;
  border-right: 1px solid var(--color-border);
}

.trail__block:last-child {
  border-right: none;
}

.trail__title {
  font-size: var(--nav-block-title-size);
  font-weight: 400;
  color: var(--color-text-muted);
  text-decoration: none;
  line-height: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

a.trail__title:hover {
  color: var(--sl-color-primary-600);
}

.trail__siblings {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: var(--nav-block-sub-size);
  font-weight: 400;
  line-height: 1;
  min-width: 0;
  overflow: hidden;
}

.trail__sibling {
  color: var(--color-text-muted);
  text-decoration: none;
  white-space: nowrap;
}

.trail__sibling:hover {
  color: var(--sl-color-primary-600);
}

.trail__sibling--current {
  color: var(--color-text);
}

.trail__sibling--boxed {
  border: 1px solid currentColor;
  border-radius: 2px;
  padding: 0 0.2rem;
}

/* Transparent so the strip's width does not change as the window slides. */
.trail__chevron {
  flex: none;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  line-height: 1;
  color: var(--color-text-dimmed);
  cursor: pointer;
}

.trail__chevron:disabled {
  opacity: 0.3;
  cursor: default;
}

.trail__chevron:not(:disabled):hover {
  color: var(--sl-color-primary-600);
}

.trail__block--elided {
  display: none;
  max-width: 2.5rem;
  justify-items: center;
}

.trail__title--elided {
  color: var(--color-text-dimmed);
  cursor: default;
}

/* The nav portal declares the container; see NavBar.vue. Below this width the outer
   levels give way to a single marker, which bounds the trail to a constant width
   however deep the book is. */
@container navportal (max-width: 44rem) {
  .trail__block--elidable {
    display: none;
  }

  .trail__block--elided {
    display: grid;
  }
}
</style>
