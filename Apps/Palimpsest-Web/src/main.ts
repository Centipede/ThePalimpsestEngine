import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import { createApp } from 'vue';
import './shoelace';
import App from './App.vue';
import { router } from './router/router.ts';

setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/dist');

const app = createApp(App);
app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('sl-');
app.use(router);
app.mount('#app');
