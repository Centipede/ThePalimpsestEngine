<template>
  <div class="matrix" :style="gridStyle">
    <div class="matrix__scroller">
      <div class="matrix__grid" @mouseover="onHover" @mouseleave="clearHover">
        <div class="matrix__corner">Book / Topic</div>

        <div
          v-for="topic in topics"
          :key="topic.id"
          class="matrix__head"
          :class="{ 'is-hot': hotTopicId === topic.id }"
          :title="topic.fullPath"
        >
          <span class="matrix__head-label">
            <span v-if="ancestorsOf(topic)" class="matrix__head-ancestors">{{ ancestorsOf(topic) }} › </span>{{ topic.name }}
          </span>
        </div>

        <template v-for="group in groups" :key="group.author">
          <div class="matrix__band">
            <span class="matrix__band-label">{{ group.author }}</span>
          </div>

          <template v-for="book in group.books" :key="book.id">
            <div
              class="matrix__row-label"
              :class="{ 'is-hot': hotBookId === book.id }"
              :title="book.machine_name"
            >
              <span class="matrix__row-title">
                <span v-if="publishedYear(book.published)" class="matrix__row-year">
                  ({{ publishedYear(book.published) }})
                </span>
                {{ book.title }}
              </span>
              <span class="matrix__row-count">{{ assignedSets.get(book.id)?.size || 0 }}</span>
            </div>

            <button
              v-for="topic in topics"
              :key="topic.id"
              type="button"
              class="matrix__cell"
              :class="{
                'is-assigned': assignedSets.get(book.id)?.has(topic.id),
                'is-pending': pending.has(cellKey(book.machine_name, topic.id)),
                'is-hot': hotBookId === book.id || hotTopicId === topic.id,
              }"
              :data-book="book.id"
              :data-topic="topic.id"
              :disabled="pending.has(cellKey(book.machine_name, topic.id))"
              :aria-pressed="assignedSets.get(book.id)?.has(topic.id) ? 'true' : 'false'"
              :aria-label="`${book.title} — ${topic.fullPath}`"
              @click="emit('toggle', { book, topicId: topic.id })"
            ></button>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Book } from '../../types/library';
import type { BookByAuthor, FlattenedTopic } from '../../stores/library';

const props = defineProps<{
  groups: BookByAuthor[];
  topics: FlattenedTopic[];
  /** Cell keys (`${machine_name}:${topicId}`) with a PATCH in flight. */
  pending: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'toggle', payload: { book: Book; topicId: number }): void;
}>();

/** CSS custom properties passed through :style must be strings. */
const gridStyle = computed(() => ({ '--topic-count': String(props.topics.length) }));

/**
 * One Set per book: `book.topics.includes(id)` evaluated per cell would be
 * O(rows x columns x topics-per-book) on every re-render.
 */
const assignedSets = computed(() => {
  const map = new Map<number, Set<number>>();
  for (const group of props.groups) {
    for (const book of group.books) {
      map.set(book.id, new Set(book.topics ?? []));
    }
  }
  return map;
});

function cellKey(machineName: string, topicId: number): string {
  return `${machineName}:${topicId}`;
}

/** The parent prefix of a full path, so the leaf name can carry the contrast. */
function ancestorsOf(topic: FlattenedTopic): string {
  const suffix = ` > ${topic.name}`;
  return topic.fullPath.endsWith(suffix)
    ? topic.fullPath.slice(0, -suffix.length)
    : '';
}

/** Same row identity as the Study Home book list, so the two views read alike. */
function publishedYear(value: string): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 4);
  }

  return String(date.getFullYear());
}

// Crosshair highlight by delegation: one listener on the grid rather than two
// per cell, which matters at a few thousand cells.
const hotBookId = ref<number | null>(null);
const hotTopicId = ref<number | null>(null);

function onHover(e: MouseEvent) {
  const cell = (e.target as HTMLElement).closest<HTMLElement>('.matrix__cell');
  hotBookId.value = cell ? Number(cell.dataset.book) : null;
  hotTopicId.value = cell ? Number(cell.dataset.topic) : null;
}

function clearHover() {
  hotBookId.value = null;
  hotTopicId.value = null;
}
</script>

<style scoped>
.matrix {
  --matrix-row-label-width: 17rem;
  --matrix-cell-width: 2rem;
  /* Deliberately NOT --header-height: that is the navbar's, set in style.css. */
  --matrix-head-height: 13rem;
  --matrix-row-height: 2rem;

  flex: 1;
  min-height: 0;
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--sl-border-radius-medium);
  background: var(--color-surface);
  overflow: hidden; /* clips the rounded corners */
}

/* The one scrollport that both sticky axes resolve against. */
.matrix__scroller {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.matrix__grid {
  display: grid;
  grid-template-columns:
    var(--matrix-row-label-width)
    repeat(var(--topic-count), var(--matrix-cell-width));
  /* Row 1 is the rotated topic headers, and it needs an EXPLICIT track: a fixed
     grid-auto-rows length does not grow to fit content, so without this the
     13rem headers overflow a 2rem track and their sticky, opaque bodies paint
     over the first few book rows. grid-auto-rows then sizes only rows 2+. */
  grid-template-rows: var(--matrix-head-height);
  grid-auto-rows: var(--matrix-row-height);
  width: max-content;
}

/* Sticky ladder: corner 4 > header 3 > row and band labels 2 > cells 0.
   Every sticky cell needs its own opaque background, because the scrolling
   content passes underneath it. */
.matrix__corner {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 4;
  grid-row: 1;
  display: flex;
  align-items: flex-end;
  padding: 0 0.5rem 0.5rem;
  background: var(--color-surface);
  box-shadow: 1px 0 0 var(--color-border), 0 1px 0 var(--color-border);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.matrix__head {
  position: sticky;
  top: 0;
  z-index: 3;
  grid-row: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 0.4rem;
  background: var(--color-surface);
  box-shadow: inset -1px 0 0 var(--color-border), 0 1px 0 var(--color-border);
  overflow: hidden;
}

/* A full topic path cannot fit a 2rem column, so headers read bottom-to-top. */
.matrix__head-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: calc(var(--matrix-head-height) - 0.8rem);
  font-size: 0.8rem;
  line-height: 1;
  color: var(--color-text);
}

.matrix__head-ancestors {
  color: var(--color-text-dimmed);
}

.matrix__head.is-hot {
  background: var(--color-bg-muted);
}

.matrix__head.is-hot .matrix__head-label {
  color: var(--color-accent);
}

.matrix__band {
  /* repeat(<integer>, …) is an explicit track list, so -1 resolves. */
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  background: var(--color-bg-muted);
  box-shadow: 0 1px 0 var(--color-border);
}

/* The band spans the whole scroll width, so only its label is pinned left.
   Bands are not vertically sticky, to avoid fighting the header row. */
.matrix__band-label {
  position: sticky;
  left: 0;
  z-index: 2;
  padding: 0 0.5rem;
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.matrix__row-label {
  position: sticky;
  left: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.5rem;
  background: var(--color-surface);
  box-shadow: 1px 0 0 var(--color-border), inset 0 -1px 0 var(--color-border);
  font-size: 0.85rem;
  overflow: hidden;
}

.matrix__row-label.is-hot {
  background: var(--color-bg-muted);
}

.matrix__row-title {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.matrix__row-year {
  color: var(--color-text-muted);
}

/* How many topics this book has at all — visible without scanning the row. */
.matrix__row-count {
  flex: none;
  color: var(--color-text-dimmed);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.matrix__cell {
  all: unset; /* resets display too, hence the re-declaration below */
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Inset shadows rather than borders: no double-width seams, and the tracks
     stay exactly --matrix-cell-width wide. */
  box-shadow: inset -1px 0 0 var(--color-border), inset 0 -1px 0 var(--color-border);
  transition: background-color var(--sl-transition-fast);
}

.matrix__cell::before {
  content: '';
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: transparent;
  border: 1px solid transparent;
  transition: background-color var(--sl-transition-fast), border-color var(--sl-transition-fast);
}

.matrix__cell:hover::before {
  border-color: var(--color-text-dimmed);
}

.matrix__cell.is-assigned::before {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.matrix__cell:hover,
.matrix__cell.is-hot {
  background: var(--color-bg-muted);
}

.matrix__cell.is-pending {
  cursor: progress;
}

.matrix__cell.is-pending::before {
  animation: matrix-pulse 0.9s ease-in-out infinite;
}

.matrix__cell:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -3px;
}

@keyframes matrix-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
