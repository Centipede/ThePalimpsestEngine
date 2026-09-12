import { createPinia } from 'pinia';
import { createHead } from '@unhead/vue';
import { createApp } from 'vue';
import './shoelace';
import './style.css';
import App from './App.vue';
import { router } from './router/router.ts';

const app = createApp(App);
const head = createHead();

app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('sl-');
app.use(createPinia());
app.use(head);
app.use(router);
app.mount('#app');
