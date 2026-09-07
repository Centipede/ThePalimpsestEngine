<script setup lang="ts">
import BookListView from '../components/BookListView.vue';
</script>

<template>
  <div class="study-home-layout">
    <aside class="logo-sidebar">
      <img src="/logos/palimpsest-logo.png" alt="Palimpsest Logo" class="main-logo" />
    </aside>

    <div class="study-home-page">
      <BookListView />
    </div>
  </div>
</template>

<style scoped>
.study-home-layout {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 80rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.logo-sidebar {
  position: absolute;
  top: 2rem;
  left: 1rem;
  width: 12rem;
  padding-top: 1rem;
}

.main-logo {
  width: 100%;
  height: auto;
  opacity: 0.9;
}

.study-home-page {
  box-sizing: border-box;
  width: min(100%, 48rem);
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

  .logo-sidebar {
    position: static;
    width: 8rem;
    padding-top: 0;
  }

  .study-home-page {
    width: 100%;
  }
}
</style>
