<template>
  <div class="toc">
    <div
      v-for="entry in allEntries"
      v-show="isVisible(entry)"
      :key="entry.section.path_full"
      class="toc__row"
      :class="`toc__row--depth-${entry.depth}`"
      @click="goToSection(entry.section.path_full)"
    >
      <span class="toc__badge toc__badge--id" :title="entry.section.path_full">
        {{ entry.section.path_id }}
      </span>

      <span class="toc__title">
        <sl-icon
          v-if="entry.hasChildren"
          :name="isCollapsed(entry.section.path_full) ? 'chevron-right' : 'chevron-down'"
          class="toc__chevron"
          @click.stop="toggle(entry.section.path_full)"
        />
        <span v-else class="toc__chevron-spacer" />
        {{ entry.section.title_text }}
      </span>

      <span class="toc__badge toc__badge--qa" title="Questions &amp; Answers">Q&A</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Flow, Section } from '../types/library';

const props = defineProps<{ 
  flows: Flow[],
  machineName: string
}>();

const router = useRouter();

interface TocEntry {
  section: Section;
  depth: number;
  hasChildren: boolean;
}

function walkTree(sections: Section[], depth: number, result: TocEntry[] = []): TocEntry[] {
  for (const s of sections) {
    if (!s.level_type) continue;
    const hasChildren = !!(s.subsections?.length);
    result.push({ section: s, depth, hasChildren });
    if (s.subsections?.length) {
      walkTree(s.subsections, depth + 1, result);
    }
  }
  return result;
}

const mainFlow = computed(() => props.flows.find(f => f.name === 'main'));

const allEntries = computed<TocEntry[]>(() => {
  const root = mainFlow.value?.tree;
  if (!root?.subsections?.length) return [];
  return walkTree(root.subsections, 0);
});

const collapsed = ref<string[]>([]);
let initialized = false;

watch(allEntries, (entries) => {
  if (!initialized && entries.length > 0) {
    collapsed.value = entries
      .filter(e => e.hasChildren && e.depth >= 1)
      .map(e => e.section.path_full);
    initialized = true;
  }
}, { immediate: true });

function isCollapsed(pathFull: string): boolean {
  return collapsed.value.includes(pathFull);
}

function toggle(pathFull: string) {
  const idx = collapsed.value.indexOf(pathFull);
  if (idx >= 0) collapsed.value.splice(idx, 1);
  else collapsed.value.push(pathFull);
}

function goToSection(pathFull: string) {
  router.push(`/study/${props.machineName}/section/${pathFull}`);
}

function isVisible(entry: TocEntry): boolean {
  const parts = entry.section.path_full.split('.');
  for (let i = 2; i < parts.length; i++) {
    if (isCollapsed(parts.slice(0, i).join('.'))) return false;
  }
  return true;
}
</script>

<style scoped>
.toc {
  padding: 0.5rem 0;
}

.toc__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  transition: background 0.1s;
  user-select: none;
  cursor: pointer;
}

.toc__row:hover {
  background: var(--color-bg-muted);
}

.toc__row--depth-0 {
  font-size: 1rem;
  font-weight: 600;
  padding-left: 1rem;
}

.toc__row--depth-1 {
  font-size: 0.9375rem;
  font-weight: 400;
  padding-left: 2.5rem;
}

.toc__row--depth-2 {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding-left: 4rem;
}

.toc__row--depth-3 {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  padding-left: 5.5rem;
}

.toc__row--depth-4 {
  font-size: 0.825rem;
  color: var(--color-text-muted);
  padding-left: 7rem;
}

.toc__row--depth-5 {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  padding-left: 8.5rem;
}

.toc__title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.toc__chevron {
  flex-shrink: 0;
  font-size: 0.75em;
  color: var(--color-text-dimmed);
}

.toc__chevron-spacer {
  display: inline-block;
  width: 0.75em;
  flex-shrink: 0;
}

.toc__badge {
  flex-shrink: 0;
  display: inline-block;
  padding: 0.1em 0.45em;
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 500;
  font-family: var(--sl-font-mono, monospace);
  line-height: 1.35;
  white-space: nowrap;
  text-align: center;
}

.toc__badge--id {
  background: var(--color-bg-muted);
  color: var(--color-text-muted);
  min-width: 4rem;
}

.toc__badge--qa {
  background: var(--sl-color-success-100, #d1fae5);
  color: var(--sl-color-success-700, #065f46);
  min-width: 3rem;
}
</style>