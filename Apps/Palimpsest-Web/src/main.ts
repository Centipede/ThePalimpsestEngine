import { createPinia } from 'pinia';
import { createApp } from 'vue';
import './shoelace';
import './style.css';
import App from './App.vue';
import { router } from './router/router.ts';

const app = createApp(App);
app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('sl-');
app.use(createPinia());
app.use(router);
app.mount('#app');
