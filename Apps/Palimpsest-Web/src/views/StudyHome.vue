<script setup lang="ts">
import { useHead } from '@unhead/vue';
import BookListView from '../components/BookListView.vue';
import StudyNoteListView from '../components/studynotes/StudyNoteListView.vue';

useHead({
  title: 'Study Home | Palimpsest Engine',
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: '/logos/palimpsest-menu-icon.svg',
    },
  ],
});
</script>

<template>
  <div class="study-home-layout">
    <div class="study-home-page">
      <BookListView />
      <StudyNoteListView />
    </div>
  </div>
</template>

<style scoped>
.study-home-layout {
  /* Height of the book browser panel; its list column scrolls inside this. */
  --panel-height: clamp(26rem, calc(100svh - 14rem), 60rem);

  box-sizing: border-box;
  width: 100%;
  max-width: 110rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.study-home-page {
  box-sizing: border-box;
  width: 100%;
  margin: 0 auto;
  padding: 0;
}

@media (max-width: 900px) {
  .study-home-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .study-home-page {
    width: 100%;
  }
}
</style>
