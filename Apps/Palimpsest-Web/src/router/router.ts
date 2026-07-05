import { createRouter, createWebHistory } from 'vue-router';
import BookListView from '../views/BookListView.vue';

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: BookListView },
    ],
});
