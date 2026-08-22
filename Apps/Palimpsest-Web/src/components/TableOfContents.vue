<template>
  <div class="toc-wrapper">
    <div class="toc">
      <div
        v-for="entry in allEntries"
        v-show="isVisible(entry)"
        :key="entry.section.path_full"
        class="toc__row"
        :class="[`toc__row--depth-${entry.depth}`, { 'toc__row--ancestor': entry.isAncestor }]"
      >
        <span class="toc__badge toc__badge--id" :title="entry.section.path_full">
          {{ entry.section.path_id }}
        </span>

        <sl-icon
          v-if="entry.hasChildren && !entry.isAncestor"
          :name="isCollapsed(entry.section.path_full) ? 'chevron-right' : 'chevron-down'"
          class="toc__chevron"
          @click.stop="toggle(entry.section.path_full)"
        />
        <span v-else class="toc__chevron-spacer" />

        <router-link
          class="toc__title"
          :to="`/study/${props.machineName}/section/${entry.section.path_full}`"
        >
          {{ entry.section.title_text }}
        </router-link>

        <span class="toc__badge toc__badge--qa" title="Questions &amp; Answers">Q&A</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import type { Flow, Section } from '../types/library';

const props = defineProps<{ 
  flows: Flow[],
  machineName: string,
  root_section_pf?: string
}>();

interface TocEntry {
  section: Section;
  depth: number;
  hasChildren: boolean;
  isAncestor?: boolean;
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

function findPath(sections: Section[], targetPath: string): Section[] {
  for (const s of sections) {
    if (s.path_full === targetPath) return [s];
    if (targetPath.startsWith(s.path_full + '.') && s.subsections) {
      const subPath = findPath(s.subsections, targetPath);
      if (subPath.length) return [s, ...subPath];
    }
  }
  return [];
}

const mainFlow = computed(() => props.flows.find(f => f.name === 'main'));

const allEntries = computed<TocEntry[]>(() => {
  const root = mainFlow.value?.tree;
  if (!root?.subsections?.length) return [];

  if (props.root_section_pf) {
    const path = findPath(root.subsections, props.root_section_pf);
    if (!path.length) return [];

    const entries: TocEntry[] = [];
    // Ancestors (all but the last one in path)
    for (let i = 0; i < path.length - 1; i++) {
      entries.push({
        section: path[i],
        depth: i,
        hasChildren: true,
        isAncestor: true
      });
    }

    // The target section and its children
    const target = path[path.length - 1];
    entries.push({
      section: target,
      depth: path.length - 1,
      hasChildren: !!target.subsections?.length
    });

    if (target.subsections?.length) {
      walkTree(target.subsections, path.length, entries);
    }
    return entries;
  }

  return walkTree(root.subsections, 0);
});

const collapsed = ref<string[]>([]);
let initialized = false;

watch(() => props.root_section_pf, () => {
  initialized = false;
});

watch(allEntries, (entries) => {
  if (!initialized && entries.length > 0) {
    let threshold = 1;
    if (props.root_section_pf) {
      const targetEntry = entries.find(e => e.section.path_full === props.root_section_pf);
      if (targetEntry) {
        threshold = targetEntry.depth + 2;
      }
    }

    collapsed.value = entries
      .filter(e => e.hasChildren && !e.isAncestor && e.depth >= threshold)
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

function isVisible(entry: TocEntry): boolean {
  if (entry.isAncestor) return true;
  const parts = entry.section.path_full.split('.');
  // Check from the first level after book ID
  for (let i = 2; i < parts.length; i++) {
    const parentPath = parts.slice(0, i).join('.');
    if (isCollapsed(parentPath)) return false;
  }
  return true;
}
</script>

<style scoped>
.toc-wrapper {
  margin-bottom: 2rem;
}

.toc-summary {
  font-weight: 600;
  color: var(--color-text, #111827);
  padding: 0.5rem 1rem;
}

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
}

.toc__row:hover {
  background: var(--color-bg-muted);
}

.toc__row--ancestor {
  background: var(--color-bg-muted, #f9fafb);
  opacity: 0.8;
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
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.toc__title:hover {
  text-decoration: underline;
}

.toc__chevron {
  flex-shrink: 0;
  font-size: 0.75em;
  color: var(--color-text-dimmed);
  cursor: pointer;
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