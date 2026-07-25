import { createRouter, createWebHistory } from 'vue-router';
import UnauthorizedView from '../views/UnauthorizedView.vue';
import AdminHome from '../views/AdminHome.vue';
import StudyHome from '../views/StudyHome.vue';
import { useAuth } from '../composables/useAuth';

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: UnauthorizedView },
        { path: '/admin', component: AdminHome },
        { path: '/study', component: StudyHome },
    ],
});

router.beforeEach((to) => {
    const { isAuthenticated } = useAuth();
    if (to.path !== '/' && !isAuthenticated.value) {
        return '/';
    }
});
