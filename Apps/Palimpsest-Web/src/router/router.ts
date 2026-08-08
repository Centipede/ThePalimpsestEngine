import { createRouter, createWebHistory } from 'vue-router';
import UnauthorizedView from '../views/UnauthorizedView.vue';
import AdminHome from '../views/AdminHome.vue';
import StudyHome from '../views/StudyHome.vue';
import { useAuth } from '../composables/useAuth';
import BookStudyView from "../components/BookStudyView.vue";

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: UnauthorizedView },
        { path: '/admin', component: AdminHome },
        { path: '/study', component: StudyHome },
        {
            path: '/study/:machine_name',
            component: BookStudyView,
            props: (route) => ({
                machineName: route.params.machine_name,
            }),
        },
    ],
});

router.beforeEach((to) => {
    const { isAuthenticated } = useAuth();
    
    // Redirect to login if not authenticated
    if (to.path !== '/' && !isAuthenticated.value) {
        return { path: '/', query: { next: to.fullPath } };
    }
    
    // Redirect to study if already authenticated and hitting the landing page
    if (to.path === '/' && isAuthenticated.value) {
        return '/study';
    }
});
