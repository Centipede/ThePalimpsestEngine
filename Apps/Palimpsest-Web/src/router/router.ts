import { createRouter, createWebHistory } from 'vue-router';
import UnauthorizedView from '../views/UnauthorizedView.vue';
import AdminHome from '../views/AdminHome.vue';
import StudyHome from '../views/StudyHome.vue';
import Search from '../views/Search.vue';
import StudyWorkspaceView from '../views/StudyWorkspaceView.vue';
import { useAuth } from '../composables/useAuth';
import BookDetailView from "../components/BookDetailView.vue";
import SectionDetailView from "../components/SectionDetailView.vue";
import ContentBlockDetailView from "../components/ContentBlockDetailView.vue";
import AdminFacets from "../views/AdminFacets.vue";
import AdminFacetDetail from "../views/AdminFacetDetail.vue";

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: UnauthorizedView },
        { path: '/admin', component: AdminHome,
        children: [
            { path: 'facets', component: AdminFacets },
            { path: 'facets/:id', component: AdminFacetDetail, props: true },
        ]},
        { path: '/study', component: StudyHome },
        { path: '/search', component: Search },
        {
            path: '/study/:machine_name',
            component: BookDetailView,
            props: (route) => ({
                machineName: route.params.machine_name,
            }),
            children: [
                {
                    path: 'section/:path_full',
                    component: SectionDetailView,
                    props: (route) => ({
                        machineName: route.params.machine_name,
                        sectionPath: route.params.path_full,
                    }),
                    children: [
                        {
                            path: 'content/:block_id',
                            component: ContentBlockDetailView,
                        }
                    ]
                },
            ],
        },
        {
            path: '/study/:machine_name/workspace/:type/:id',
            component: StudyWorkspaceView,
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
