<template>
  <div class="book-study">
    <p v-if="loading" class="book-study__status">Loading…</p>
    <p v-else-if="error" class="book-study__status book-study__status--error">{{ error }}</p>
    <template v-else-if="book">
      <Teleport to=".nav-mid-title-portal">
        <header class="book-study__header">
          <router-link :to="`/study/${machineName}`" class="book-study__title-link">
            <div class="book-study__title">{{ book.book.title }}</div>
          </router-link>
          <span v-if="author" class="book-study__author">{{ author.full_name }}</span>
        </header>
      </Teleport>

      <template v-if="!isSectionActive">
        <div class="book-study__toolbar">
          <div class="toolbar-infoleft" />
          <div class="tools-left" />
          <div class="tools-mid">
            <sl-button-group>
              <sl-tooltip content="Expand All">
                <sl-icon-button name="arrows-expand" label="Expand All" @click="tocRef?.expandAll()"></sl-icon-button>
              </sl-tooltip>
              <sl-tooltip content="Collapse All">
                <sl-icon-button name="arrows-collapse" label="Collapse All" @click="tocRef?.collapseAll()"></sl-icon-button>
              </sl-tooltip>
            </sl-button-group>

            <sl-divider vertical></sl-divider>

            <div class="depth-control">
              <sl-input
                type="number"
                size="small"
                v-model.number="depthLevel"
                min="0"
                max="9"
                class="depth-input"
              ></sl-input>
              <sl-button-group>
                <sl-button size="small" @click="tocRef?.expandToDepth(depthLevel)">
                  Expand &lt; {{ depthLevel }}
                </sl-button>
                <sl-button size="small" @click="tocRef?.collapseBelowDepth(depthLevel)">
                  Collapse &gt; {{ depthLevel }}
                </sl-button>
              </sl-button-group>
            </div>
          </div>
          <div class="tools-right" />
          <div class="toolbar-inforight" />
        </div>

        <TableOfContents ref="tocRef" :book-structure="book" :machineName="machineName"/>
      </template>
      <template v-else-if="isSectionActive">
        <router-view v-slot="{ Component }">
          <component :is="Component" :book-structure="book"/>
        </router-view>
      </template>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { apiFetch } from '../api';
import type { BookStructure } from '../types/library';
import { useLibraryStore } from '../stores/library';
import TableOfContents from './TableOfContents.vue';
import {useHead} from "@unhead/vue";

const props = defineProps<{ machineName: string }>();

const route = useRoute();
const isSectionActive = computed(() => !!route.params.path_full);

const store = useLibraryStore();
const book = ref<BookStructure | null>(null);
const author = computed(() => store.getAuthorById(book.value?.book.by_author ?? null));
const loading = ref(true);
const error = ref('');
const pageTitle = computed(() => `${book.value?.book.abbrev ?? props.machineName} | ${author.value?.abbrev ?? ''}`);

const depthLevel = ref(1);
const tocRef = ref<InstanceType<typeof TableOfContents> | null>(null);

useHead({
  title: pageTitle
});

onMounted(async () => {
  try {
    // Ensure authors are loaded (cached in store)
    const authorsPromise = store.fetchAuthors();

    // Fetch book structure
    const bookRes = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/structure/?tree_depth=5&qas=1&conversations=1&studynotes=1&ref_title=1&pageinfo=1&path_coded=1`);
    if (!bookRes.ok) throw new Error(`Book: HTTP ${bookRes.status}`);

    const [_, bookData] = await Promise.all([authorsPromise, bookRes.json()]);
    book.value = bookData;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load book';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.book-study {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  padding: 0.5rem 1rem;
}

.book-study__toolbar {
  position: sticky;
  top: -0.5rem;
  z-index: 100;
  background: var(--color-bg);
  padding: 0.25rem 0;
  margin-bottom: 1rem;
  display: grid;
  grid-template-columns: 80px 1fr 4fr 1fr 80px;
  grid-template-areas: "infoleft summary content entities inforight";
  align-items: center;

  gap: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.book-study__toolbar sl-divider {
  height: 1.5rem;
  --spacing: 0.5rem;
}

.book-study__toolbar sl-icon-button {
  font-size: 1.1rem;
}

.toolbar-infoleft {
  grid-area: infoleft;
}

.book-study__toolbar .tools-left {
  grid-area: summary;
  justify-self: start;
}

.book-study__toolbar .tools-mid {
  grid-area: content;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.book-study__toolbar .tools-right {
  grid-area: entities;
  display: flex;
  justify-content: space-between;
  justify-self: end;
  gap: 0.5rem;
}

.toolbar-inforight {
  grid-area: inforight;
}

.depth-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.depth-input {
  width: 60px;
}

.book-study__header {
  max-width: 18rem;
  overflow: hidden;
  padding: 0.1rem 1rem 0.1rem;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--sl-color-neutral-200);
}

.book-study__title-link {
  text-decoration: none;
}

.book-study__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

.book-study__title-link:hover .book-study__title {
  color: var(--sl-color-primary-600);
}

.book-study__author {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  font-weight: 300;
  color: var(--color-text-muted);
}

.book-study__status {
  padding: 2rem;
  color: var(--color-text-muted);
}

.book-study__status--error {
  color: var(--sl-color-danger-600, #dc2626);
}
</style>
