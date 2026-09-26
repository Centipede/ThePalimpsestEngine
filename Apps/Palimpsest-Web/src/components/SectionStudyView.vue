<template>
  <div class="section-study">

    <p v-if="loading" class="section-study__status">Loading…</p>
    <p v-else-if="error" class="section-study__status section-study__status--error">{{ error }}</p>
    <template v-else-if="data">
      <Teleport to=".nav-mid-title-portal">
        <div class="nav-portal-content">
          <sl-breadcrumb>
            <sl-breadcrumb-item v-for="crumb in breadcrumbs.slice(1)" :key="crumb.path">
              <router-link :to="crumb.path" class="breadcrumb-link">{{ crumb.title }}</router-link>
            </sl-breadcrumb-item>
          </sl-breadcrumb>
          <sl-badge variant="neutral" pill >{{ data.section.path_coded ?? data.section.path_full }}</sl-badge>
        </div>
      </Teleport>

      <div class="section-study__toolbar">

        <div class="toolbar-infoleft" />

        <div class="tools-left">
          <sl-dropdown stay-open-on-select>
            <sl-button slot="trigger" size="small" caret>Summaries</sl-button>
            <sl-menu @sl-select="handleToolbarSelect('info-left', $event)">
              <sl-menu-item
                  v-for="item in availableInfoLeft"
                  :key="item.type"
                  :value="item.type"
                  type="checkbox"
                  size="small"
                  :checked="item.checked"
              >
                {{ item.name }}
              </sl-menu-item>
            </sl-menu>
          </sl-dropdown>
        </div>

        <div class="tools-mid">
          <sl-button-group>
            <sl-button
                size="small"
                :variant="showTableOfContents ? 'primary' : 'default'"
                @click="showTableOfContents = !showTableOfContents"
                title="Toggle Table of Contents"
            >
              <sl-icon name="diagram-3"></sl-icon>
            </sl-button>
            <sl-button
                size="small"
                :variant="showSummary ? 'primary' : 'default'"
                @click="showSummary = !showSummary"
                title="Toggle Summary"
            >
              <sl-icon name="card-heading"></sl-icon>
            </sl-button>
            <sl-button
                size="small"
                :variant="showSegmentsOverview ? 'primary' : 'default'"
                @click="showSegmentsOverview = !showSegmentsOverview"
                title="Toggle Segments Overview"
            >
              <sl-icon name="hdd-stack"></sl-icon>
            </sl-button>
            <sl-button
                size="small"
                :variant="showEntities ? 'primary' : 'default'"
                @click="showEntities = !showEntities"
                title="Toggle Entities"
            >
              <sl-icon name="people"></sl-icon>
            </sl-button>
          </sl-button-group>

          <sl-divider vertical></sl-divider>

            <sl-button-group>
              <sl-button
                  size="small"
                  :variant="organiseMode === 'linear' ? 'primary' : 'default'"
                  @click="organiseMode = 'linear'"
                  title="Linear View"
              >
                <sl-icon name="list"></sl-icon>
              </sl-button>
              <sl-button
                  v-if="data.section.info?.summary?.paragraph_segments?.length"
                  size="small"
                  :variant="organiseMode === 'segmented' ? 'primary' : 'default'"
                  @click="organiseMode = 'segmented'"
                  title="Segmented View"
              >
                <sl-icon name="layers-half"></sl-icon>
              </sl-button>
            </sl-button-group>

            <sl-button-group>
              <sl-tooltip content="Expand All Segments">
                <sl-icon-button
                    name="plus-square"
                    label="Expand All Segments"
                    :disabled="organiseMode !== 'segmented'"
                    @click="expandAllSegments"
                ></sl-icon-button>
              </sl-tooltip>
              <sl-tooltip content="Collapse All Segments">
                <sl-icon-button
                    name="dash-square"
                    label="Collapse All Segments"
                    :disabled="organiseMode !== 'segmented'"
                    @click="collapseAllSegments"
                ></sl-icon-button>
              </sl-tooltip>
            </sl-button-group>

          <sl-divider vertical></sl-divider>

          <sl-button-group>
            <sl-tooltip content="Expand All Paragraphs">
              <sl-icon-button name="arrows-expand" label="Expand All Paragraphs" @click="expandAllParagraphs"></sl-icon-button>
            </sl-tooltip>
            <sl-tooltip content="Collapse All Paragraphs">
              <sl-icon-button name="arrows-collapse" label="Collapse All Paragraphs" @click="collapseAllParagraphs"></sl-icon-button>
            </sl-tooltip>
          </sl-button-group>

          <sl-dropdown stay-open-on-select>
            <sl-button slot="trigger" size="small" caret>Highlights</sl-button>
            <sl-menu @sl-select="handleToolbarSelect('highlights', $event)">
              <sl-menu-item
                  v-for="item in availableHighlights"
                  :key="item.type"
                  :value="item.type"
                  type="checkbox"
                  size="small"
                  :checked="item.checked"
              >
                {{ item.name }}
              </sl-menu-item>
            </sl-menu>
          </sl-dropdown>

        </div>

        <div class="tools-right">
          <sl-dropdown size="small" stay-open-on-select>
            <sl-button slot="trigger" size="small" caret>Entities</sl-button>
            <sl-menu @sl-select="handleToolbarSelect('info-right', $event)">
              <sl-menu-item
                  v-for="item in availableInfoRight"
                  :key="item.type"
                  :value="item.type"
                  type="checkbox"
                  size="small"
                  :checked="item.checked"
              >
                {{ item.name }}
              </sl-menu-item>
            </sl-menu>
          </sl-dropdown>

          <sl-divider vertical></sl-divider>

          <sl-button-group>
            <sl-button size="small" @click="openCorpusDialog('ask')">
              <sl-icon slot="prefix" name="chat-dots"></sl-icon>
              Ask
            </sl-button>
            <sl-button size="small" @click="openCorpusDialog('talk')">
              <sl-icon slot="prefix" name="chat-quote"></sl-icon>
              Talk
            </sl-button>
          </sl-button-group>

        </div>

        <div class="toolbar-inforight" />

      </div>

      <TableOfContents
          v-if="showTableOfContents && props.bookStructure"
          :book-structure="props.bookStructure"
          :machine-name="props.machineName"
          :root_section_pf="props.sectionPath"
      />

      <SummaryInfoRecord v-if="showSummary" :machine-name="props.machineName" :section-path="props.sectionPath"/>
      <SectionSegmentsOverview v-if="showSegmentsOverview && data.section.info?.summary?.paragraph_segments" :segments="data.section.info.summary.paragraph_segments"/>
      <SectionEntities v-if="showEntities && data.section.info?.entities" :entities="data.section.info.entities"/>

      <CorpusStudyDialog
          v-model:open="corpusDialog.open"
          :type="corpusDialog.type"
          :initial-authors="initialAuthors"
          :initial-books="initialBooks"
          :initial-sections="initialSections"
          @conversation-created="handleConversationCreated"
          @qa-created="handleQACreated"
      />

      <StudyWorkspaceDialog
          v-model:open="activeItem.open"
          :type="activeItem.type"
          :loading="activeItem.loading"
          :error="activeItem.error"
          :data="activeItem.data"
          :linking-ref="activeItem.linkingRef"
          @title-updated="handleTitleUpdated"
          @pin-updated="handlePinUpdated"
          @note-updated="handleNoteUpdated"
          @turn-note-updated="handleTurnNoteUpdated"
          @turn-added="handleTurnAdded"
          @references-updated="handleReferencesUpdated"
      />

      <header v-if="data.contents.length>0" class="section-study__header">
        <h1 class="section-study__title">{{ data.section.title_text }}</h1>
        <div class="section-pages">
          <template v-if="data.section.pageinfo?.first_page">
            p. {{ data.section.pageinfo.first_page?.page_name }}{{ data.section.pageinfo?.last_page && data.section.pageinfo.last_page.page_name !== data.section.pageinfo.first_page.page_name ? ' - ' + data.section.pageinfo?.last_page.page_name : '' }}
          </template>
        </div>
      </header>

      <article class="section-study__content">

        <template v-if="organiseMode === 'linear'">
          <ContentBlockView
              v-for="(block, index) in data.contents"
              :key="block.path_id"
              :block="block"
              :index="index"
              :fold-trigger="paragraphFoldTrigger"
              :available-highlights="availableHighlights"
          />
        </template>

        <template v-else-if="organiseMode === 'segmented'">
          <div class="segments-container">
            <sl-details
                v-for="(seg, idx) in segmentedData.segments"
                :key="idx"
                class="segment-details"
                :open="!!openSegments[idx]"
                @sl-show="toggleSegment(idx, true)"
                @sl-hide="toggleSegment(idx, false)"
            >
              <div slot="summary" class="segment-summary-header">
                <div class="segment-header">
                  <sl-badge variant="success" pill class="segment-range-badge">{{ seg.ranges.join(', ') }}</sl-badge>
                  <span class="segment-caption">{{ seg.caption }}</span>
                </div>
                <p v-if="seg.description && !openSegments[idx]" class="segment-description">{{ seg.description }}</p>
              </div>

              <div class="segment-content">
                <template
                    v-for="(entry, blockIdx) in seg.blocks"
                    :key="entry.block.path_id"
                >
                  <div
                      v-if="blockIdx > 0 && entry.index - seg.blocks[blockIdx - 1].index > 1"
                      class="skipped-blocks"
                  >
                    <i>
                      … skipped {{ skippedBlockCount(entry.index, seg.blocks[blockIdx - 1].index) }}
                      {{ skippedBlockCount(entry.index, seg.blocks[blockIdx - 1].index) === 1 ? 'paragraph' : 'paragraphs' }} …
                    </i>
                  </div>

                  <ContentBlockView
                      :block="entry.block"
                      :index="entry.index"
                      :fold-trigger="paragraphFoldTrigger"
                      :available-highlights="availableHighlights"
                  />
                </template>
              </div>
            </sl-details>

            <div v-if="segmentedData.orphans.length > 0" class="orphans-section">
              <h3 class="orphans-title">Other Paragraphs</h3>
              <ContentBlockView
                  v-for="entry in segmentedData.orphans"
                  :key="entry.block.path_id"
                  :block="entry.block"
                  :index="entry.index"
                  :fold-trigger="paragraphFoldTrigger"
                  :available-highlights="availableHighlights"
              />
            </div>
          </div>
        </template>

      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from 'vue';
import { useHead } from '@unhead/vue';
import {apiFetch} from '../api';
import type {SectionContentResponse, BookStructure, Section, FoldTrigger, ToolbarToggle} from '../types/library';
import type { Conversation, ConversationRef, ConversationTurn, QuestionAnswer, QuestionAnswerRef } from '../types/study';
import SummaryInfoRecord from './SummaryInfoRecord.vue';
import SectionSegmentsOverview from './SectionSegmentsOverview.vue';
import SectionEntities from './SectionEntities.vue';
import ContentBlockView from './ContentBlockView.vue';
import TableOfContents from './TableOfContents.vue';
import CorpusStudyDialog from './corpus/CorpusStudyDialog.vue';
import StudyWorkspaceDialog from './studyworkspaces/StudyWorkspaceDialog.vue';
import {useLibraryStore} from "../stores/library.ts";

const props = defineProps<{
  machineName: string;
  sectionPath: string;
  bookStructure?: BookStructure;
}>();

const data = ref<SectionContentResponse | null>(null);
const loading = ref(true);
const error = ref('');
const organiseMode = ref<'linear' | 'segmented'>('linear');
const openSegments = ref<Record<number, boolean>>({});
const paragraphFoldTrigger = ref<FoldTrigger>({ command: 'expand-all', count: 0 });

const availableInfoLeft = ref<ToolbarToggle[]>([
  { name: 'General', type: 'general', checked: true },
  { name: 'Annotations (#3+#17)', type: 'annotations', checked: true },
  { name: 'Notes (Study #10)', type: 'notes', checked: true },
]);

const availableHighlights = ref<ToolbarToggle[]>([
  { name: 'Summary Quotes', type: 'summary-quotes', checked: true },
]);

const availableInfoRight = ref<ToolbarToggle[]>([
  { name: 'People', type: 'people', checked: true },
  { name: 'Times', type: 'times', checked: true },
  { name: 'Places', type: 'places', checked: true },
  { name: 'Works', type: 'works', checked: true },
]);

type ToolbarToggleGroup = 'info-left' | 'highlights' | 'info-right';

const store = useLibraryStore();
const author = computed(() => store.getAuthorById(props.bookStructure?.book.by_author ?? null));
const pageTitle = computed(() => `${data.value?.section.path_coded ?? props.sectionPath} | ${props.bookStructure?.book.abbrev ?? props.machineName} | ${author.value?.abbrev ?? ''}`);
useHead({
  title: pageTitle
});

function handleToolbarSelect(group: ToolbarToggleGroup, event: Event) {
  const selectedItem = (event as CustomEvent<{ item: HTMLElement }>).detail.item as HTMLElement & {
    value: string;
    checked: boolean;
  };

  setToolbarToggle(group, selectedItem.value, selectedItem.checked);
}

function setToolbarToggle(
    group: ToolbarToggleGroup,
    type: string,
    checked: boolean
) {
  const update = (items: ToolbarToggle[]) =>
      items.map(item => item.type === type ? { ...item, checked } : item);

  if (group === 'info-left') {
    availableInfoLeft.value = update(availableInfoLeft.value);
  } else if (group === 'highlights') {
    availableHighlights.value = update(availableHighlights.value);
  } else {
    availableInfoRight.value = update(availableInfoRight.value);
  }
}

const showTableOfContents = ref(true);
const showSummary = ref(false);
const showSegmentsOverview = ref(false);
const showEntities = ref(false);

const corpusDialog = ref({
  open: false,
  type: 'ask' as 'ask' | 'talk'
});

interface ActiveItem {
  type: 'conversation' | 'question_answer' | null;
  loading: boolean;
  error: string | null;
  data: Conversation | QuestionAnswer | null;
  linkingRef: ConversationRef | QuestionAnswerRef | null;
  open: boolean;
}

const activeItem = ref<ActiveItem>({
  type: null,
  loading: false,
  error: null,
  data: null,
  linkingRef: null,
  open: false
});

const initialAuthors = computed(() => {
  if (!props.bookStructure) return [];
  const authors = [props.bookStructure.book.by_author];
  if (props.bookStructure.book.by_author1) authors.push(props.bookStructure.book.by_author1);
  if (props.bookStructure.book.by_author2) authors.push(props.bookStructure.book.by_author2);
  if (props.bookStructure.book.by_author3) authors.push(props.bookStructure.book.by_author3);
  return authors;
});

const initialBooks = computed(() => {
  if (!props.bookStructure) return [];
  return [props.bookStructure.book.id];
});

const initialSections = computed(() => {
  if (!data.value?.section) return [];
  return [data.value.section.id];
});

function openCorpusDialog(type: 'ask' | 'talk') {
  corpusDialog.value.type = type;
  corpusDialog.value.open = true;
}

function toggleSegment(index: number, isOpen: boolean) {
  openSegments.value[index] = isOpen;
}

function expandAllParagraphs() {
  paragraphFoldTrigger.value = { command: 'expand-all', count: paragraphFoldTrigger.value.count + 1 };
}

function collapseAllParagraphs() {
  paragraphFoldTrigger.value = { command: 'collapse-all', count: paragraphFoldTrigger.value.count + 1 };
}

function expandAllSegments() {
  segmentedData.value.segments.forEach((_, idx) => {
    openSegments.value[idx] = true;
  });
}

function collapseAllSegments() {
  segmentedData.value.segments.forEach((_, idx) => {
    openSegments.value[idx] = false;
  });
}

function skippedBlockCount(currentIndex: number, previousIndex: number) {
  return Math.max(0, currentIndex - previousIndex - 1);
}

const parseRanges = (ranges: string[]): Set<number> => {
  const indices = new Set<number>();
  for (const range of ranges) {
    if (!range) continue;
    const parts = range.split('-').map(s => parseInt(s.trim(), 10));
    if (parts.length === 1) {
      if (!isNaN(parts[0])) indices.add(parts[0] - 1);
    } else if (parts.length === 2) {
      const [start, end] = parts;
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) indices.add(i - 1);
      }
    }
  }
  return indices;
};

const segmentedData = computed(() => {
  if (!data.value) return {segments: [], orphans: []};

  const paragraphSegments = data.value.section.info?.summary?.paragraph_segments;
  if (!paragraphSegments || paragraphSegments.length === 0) {
    return {segments: [], orphans: data.value.contents.map( (block, index) => ({block, index}))};
  }

  const allSegmentedIndices = new Set<number>();
  const segments = paragraphSegments.map(seg => {
    const indices = parseRanges(seg.ranges);
    indices.forEach(i => allSegmentedIndices.add(i));
    const blocks = data.value!.contents
        .map((block, index) => ({ block, index }))
        .filter(({ index }) => indices.has(index));

    return {
      ...seg,
      blocks
    };
  });

  const orphans = data.value.contents
      .map((block, index) => ({ block, index }))
      .filter(({ index }) => !allSegmentedIndices.has(index));

  return {segments, orphans};
});


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

async function handleConversationCreated(id: number) {
  corpusDialog.value.open = false;
  activeItem.value = {
    type: 'conversation',
    loading: true,
    error: null,
    data: null,
    linkingRef: null,
    open: true
  };

  try {
    const response = await apiFetch(`/teststudy/api/v1/conversation/${id}/`);
    if (response.ok) {
      const conv: Conversation = await response.json();
      activeItem.value.data = conv;
      if (conv.references && conv.references.length > 0) {
        activeItem.value.linkingRef = conv.references[0];
      }
    } else {
      activeItem.value.error = `Error: ${response.statusText}`;
    }
  } catch (e) {
    activeItem.value.error = (e as Error).message;
  } finally {
    activeItem.value.loading = false;
  }
}

async function handleQACreated(id: number) {
  corpusDialog.value.open = false;
  activeItem.value = {
    type: 'question_answer',
    loading: true,
    error: null,
    data: null,
    linkingRef: null,
    open: true
  };

  try {
    const response = await apiFetch(`/teststudy/api/v1/question-answer/${id}/`);
    if (response.ok) {
      const qa: QuestionAnswer = await response.json();
      activeItem.value.data = qa;
      if (qa.references && qa.references.length > 0) {
        activeItem.value.linkingRef = qa.references[0];
      }
    } else {
      activeItem.value.error = `Error: ${response.statusText}`;
    }
  } catch (e) {
    activeItem.value.error = (e as Error).message;
  } finally {
    activeItem.value.loading = false;
  }
}

function handleTitleUpdated(newTitle: string) {
  if (!activeItem.value.data || !activeItem.value.type) return;

  activeItem.value.data.title = newTitle;

  const itemId = activeItem.value.data.id;
  const itemType = activeItem.value.type;

  if (data.value?.section) {
    if (itemType === 'conversation' && data.value.section.conversations) {
      const ref = data.value.section.conversations.find(c => c.of_conversation === itemId);
      if (ref) ref.title = newTitle;
    } else if (itemType === 'question_answer' && data.value.section.question_answers) {
      const ref = data.value.section.question_answers.find(qa => qa.of_questionanswer === itemId);
      if (ref) ref.title = newTitle;
    }
  }

  if (props.bookStructure) {
    if (itemType === 'conversation' && props.bookStructure.book.conversations) {
      const ref = props.bookStructure.book.conversations.find(c => c.of_conversation === itemId);
      if (ref) ref.title = newTitle;
    } else if (itemType === 'question_answer' && props.bookStructure.book.question_answers) {
      const ref = props.bookStructure.book.question_answers.find(qa => qa.of_questionanswer === itemId);
      if (ref) ref.title = newTitle;
    }

    const updateTitleInTree = (sections: Section[]) => {
      for (const section of sections) {
        if (itemType === 'conversation' && section.conversations) {
          const ref = section.conversations.find(c => c.of_conversation === itemId);
          if (ref) ref.title = newTitle;
        } else if (itemType === 'question_answer' && section.question_answers) {
          const ref = section.question_answers.find(qa => qa.of_questionanswer === itemId);
          if (ref) ref.title = newTitle;
        }
        if (section.subsections?.length) {
          updateTitleInTree(section.subsections);
        }
      }
    };

    props.bookStructure.flows.forEach(flow => {
      if (flow.tree) {
        updateTitleInTree([flow.tree]);
      }
    });
  }
}

function handlePinUpdated(isPinned: boolean) {
  if (!activeItem.value.data || !activeItem.value.type || !activeItem.value.linkingRef) return;

  activeItem.value.linkingRef.is_pinned = isPinned;

  const refId = activeItem.value.linkingRef.id;
  const itemType = activeItem.value.type;

  if ((activeItem.value.data as any).references) {
    const ref = (activeItem.value.data as any).references.find((r: any) => r.id === refId);
    if (ref) ref.is_pinned = isPinned;
  }

  if (data.value?.section) {
    if (itemType === 'conversation' && data.value.section.conversations) {
      const ref = data.value.section.conversations.find(c => c.id === refId);
      if (ref) ref.is_pinned = isPinned;
    } else if (itemType === 'question_answer' && data.value.section.question_answers) {
      const ref = data.value.section.question_answers.find(qa => qa.id === refId);
      if (ref) ref.is_pinned = isPinned;
    }
  }

  if (props.bookStructure) {
    if (itemType === 'conversation' && props.bookStructure.book.conversations) {
      const ref = props.bookStructure.book.conversations.find(c => c.id === refId);
      if (ref) ref.is_pinned = isPinned;
    } else if (itemType === 'question_answer' && props.bookStructure.book.question_answers) {
      const ref = props.bookStructure.book.question_answers.find(qa => qa.id === refId);
      if (ref) ref.is_pinned = isPinned;
    }

    const updatePinInTree = (sections: Section[]) => {
      for (const section of sections) {
        if (itemType === 'conversation' && section.conversations) {
          const ref = section.conversations.find(c => c.id === refId);
          if (ref) ref.is_pinned = isPinned;
        } else if (itemType === 'question_answer' && section.question_answers) {
          const ref = section.question_answers.find(qa => qa.id === refId);
          if (ref) ref.is_pinned = isPinned;
        }
        if (section.subsections?.length) {
          updatePinInTree(section.subsections);
        }
      }
    };

    props.bookStructure.flows.forEach(flow => {
      if (flow.tree) {
        updatePinInTree([flow.tree]);
      }
    });
  }
}

function handleNoteUpdated(payload: { field: 'question_note' | 'answer_note', value: string | null }) {
  if (!activeItem.value.data || activeItem.value.type !== 'question_answer') return;
  (activeItem.value.data as QuestionAnswer)[payload.field] = payload.value;
}

function handleTurnNoteUpdated(payload: { turnId: number, field: 'question_note' | 'answer_note' | 'question_summary' | 'answer_summary', value: string | null }) {
  if (!activeItem.value.data || activeItem.value.type !== 'conversation') return;
  const turn = (activeItem.value.data as Conversation).turns?.find(t => t.id === payload.turnId);
  if (turn) {
    turn[payload.field] = payload.value;
  }
}

function handleTurnAdded(newTurn: ConversationTurn) {
  if (!activeItem.value.data || activeItem.value.type !== 'conversation') return;
  const conv = activeItem.value.data as Conversation;
  if (!conv.turns) {
    conv.turns = [];
  }
  conv.turns.push(newTurn);
}

async function handleReferencesUpdated() {
  if (!activeItem.value.data || !activeItem.value.type) return;

  const id = activeItem.value.data.id;
  const type = activeItem.value.type;
  const endpoint = type === 'conversation' ? 'conversation' : 'question-answer';

  activeItem.value.loading = true;
  try {
    const response = await apiFetch(`/teststudy/api/v1/${endpoint}/${id}/`);
    if (response.ok) {
      const updatedItem = await response.json();
      activeItem.value.data = updatedItem;
      if (updatedItem.references && updatedItem.references.length > 0) {
        const oldId = activeItem.value.linkingRef?.id;
        const newRef = updatedItem.references.find((r: any) => r.id === oldId) || updatedItem.references[0];
        activeItem.value.linkingRef = newRef;
      }
    }
  } catch (e) {
    console.error('Failed to refresh item after reference update', e);
  } finally {
    activeItem.value.loading = false;
  }
}

async function fetchSection() {
  loading.value = true;
  error.value = '';
  try {
    const res = await apiFetch(`/testbooks/api/v1/book/${props.machineName}/section/${props.sectionPath}/?sec_info=sum,ents&cont_info=sum,ents&path_coded=1&pageinfo=1`);
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
  padding: 0.5rem 1rem;
}

.section-study__toolbar {
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

.section-study__toolbar sl-divider {
  height: 1.5rem;
  --spacing: 0.5rem;
}

.section-study__toolbar sl-icon-button {
  font-size: 1.1rem;
}

.toolbar-infoleft {
  grid-area: infoleft;
}

.section-study__toolbar .tools-left {
  grid-area: summary;
  justify-self: start;
}

.section-study__toolbar .tools-mid {
  grid-area: content;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.section-study__toolbar .tools-right {
  grid-area: entities;
  display: flex;
  justify-content: space-between;
  justify-self: end;
  gap: 0.5rem;
}

.toolbar-inforight {
  grid-area: inforight;
}

.section-study__toolbar sl-dropdown sl-menu::part(base),
.section-study__toolbar sl-dropdown sl-menu-item::part(base) {
  font-size: 0.85rem;
}

.breadcrumb-link {
  color: var(--sl-color-neutral-600);
  text-decoration: none;
  font-size: 0.9rem;
}

.breadcrumb-link:hover {
  color: var(--sl-color-primary-600);
}

.nav-portal-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-left: 0.5rem;
}

.segments-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.segment-details::part(base) {
  border: 0px solid var(--sl-color-neutral-200);
  border-radius: var(--sl-border-radius-medium);
  background-color: var(--sl-color-neutral-50);
  overflow: hidden;
}

.segment-summary-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  text-align: left;
}

.segment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.segment-range-badge {
  flex-shrink: 0;
}

.segment-caption {
  font-weight: 200;
  color: var(--sl-color-lime-800);
}

.segment-description {
  margin: 0;
  font-size: 0.90rem;
  line-height: 1.5;
  font-style: italic;
  color: var(--sl-color-neutral-500);
}

.segment-keywords {
  font-size: 0.85rem;
  color: var(--sl-color-primary-600);
  opacity: 0.8;
}

.segment-content {
  padding: 0.25rem;
  background-color: var(--sl-color-neutral-0);
  border-top: 0 solid var(--sl-color-neutral-200);
}

.orphans-section {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 2px dashed var(--sl-color-neutral-200);
}

.orphans-title {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--sl-color-neutral-600);
}

.section-study__header {
  margin-bottom: 0.1rem;
  padding-bottom: 0.1rem;
  display: grid;
  grid-template-columns: 80px 1fr 4fr 1fr 80px;
  grid-template-areas: "infoleft summary content entities inforight";
}

.section-study__title {
  grid-area: content;
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text, #111827);
}

.section-pages {
  grid-area: inforight;
  align-self: end;
  text-align: right;
  font-size: 0.9rem;
  color: var(--color-text-muted, #6b7280);
  font-weight: 300;
  padding-bottom: 0.5rem;
}

.section-study__content {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: initial;
  margin: 2rem auto;
  width: 100%;
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