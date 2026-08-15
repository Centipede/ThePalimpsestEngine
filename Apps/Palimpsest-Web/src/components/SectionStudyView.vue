<template>
  <div class="section-study">
    <div class="section-study__nav">

    </div>

    <p v-if="loading" class="section-study__status">Loading…</p>
    <p v-else-if="error" class="section-study__status section-study__status--error">{{ error }}</p>
    <template v-else-if="data">
      <Teleport to=".nav-middle">
        <sl-breadcrumb>
          <sl-breadcrumb-item v-for="crumb in breadcrumbs.splice(1)" :key="crumb.path">
            <router-link :to="crumb.path" class="breadcrumb-link">{{ crumb.title }}</router-link>
          </sl-breadcrumb-item>
        </sl-breadcrumb>
      </Teleport>
      <header class="section-study__header">
        <h1 class="section-study__title">{{ data.section.title_text }}</h1>
      </header>

      <TableOfContents
        v-if="props.bookStructure"
        :flows="props.bookStructure.flows"
        :machine-name="props.machineName"
        :root_section_pf="props.sectionPath"
      />

      <SectionSummary v-if="data.section.info?.summary" :summary="data.section.info.summary" />
      <SectionEntities v-if="data.section.info?.entities" :entities="data.section.info.entities" />

      <article class="section-study__content">
        <h2 class="section-study__content-title">Content</h2>
        <ContentBlockView
            v-for="(block, index) in data.contents"
            :key="block.path_id"
            :block="block"
            :index="index"
        />
      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '../api';
import type { SectionContentResponse, BookStructure, Section } from '../types/library';
import SectionSummary from './SectionSummary.vue';
import SectionEntities from './SectionEntities.vue';
import ContentBlockView from './ContentBlockView.vue';
import TableOfContents from './TableOfContents.vue';

const props = defineProps<{
  machineName: string;
  sectionPath: string;
  bookStructure?: BookStructure;
}>();

const router = useRouter();
const data = ref<SectionContentResponse | null>(null);
const loading = ref(true);
const error = ref('');

console.log(router)

const breadcrumbs = computed(() => {
  if (!props.bookStructure) return [];
  const mainFlow = props.bookStructure.flows.find(f => f.name === 'main');
  const tree = mainFlow?.tree;
  if (!tree) return [];

  const crumbs = [];
  crumbs.push({
    title: props.bookStructure.book.title,
    path: `/study/${props.machineName}`
  });

  const parts = props.sectionPath.split('.').slice(1);

  let currentTree: Section | null = tree;

  let currentPath = '';
  for (const part of parts) {
    if (currentPath) currentPath += '.';
    currentPath += part;

    const found: Section | undefined = currentTree?.subsections?.find(s => s.path_id === part);
    if (found) {
      crumbs.push({
        title: found.title_text,
        path: `/study/${props.machineName}/section/${found.path_full}`
      });
      currentTree = found;
    } else {
      break;
    }
  }
  
  return crumbs;
});

async function fetchSection() {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/?sec_info=sum,ents&cont_info=sum,ents`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data.value = await res.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load section';
  } finally {
    loading.value = false;
  }
}

onMounted(fetchSection);
watch(() => props.sectionPath, fetchSection);
</script>

<style scoped>
.section-study {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  padding: 2rem;
}

.section-study__nav {
  margin-bottom: 2rem;
  padding: 0.5rem 0;
}

.breadcrumb-link {
  color: var(--sl-color-neutral-600);
  text-decoration: none;
  font-size: 0.9rem;
}

.breadcrumb-link:hover {
  color: var(--sl-color-primary-600);
}

.section-study__header {
  margin-bottom: 2.5rem;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  padding-bottom: 1rem;
}

.section-study__title {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text, #111827);
}

.section-study__content {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 1200px;
  margin: 2rem auto;
  width: 100%;
}

.section-study__content-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--color-text, #111827);
  border-bottom: 2px solid var(--sl-color-neutral-200);
  padding-bottom: 0.5rem;
}

.section-study__status {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-muted, #6b7280);
  font-size: 1.1rem;
}

.section-study__status--error {
  color: var(--sl-color-danger-600, #dc2626);
}
</style>