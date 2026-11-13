// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import { useAdminPanels } from './useAdminPanels';

/**
 * The collapse behaviour hangs on one non-obvious integration detail: `snap` is a
 * *property* on sl-split-panel, not an attribute, and the only reason `:snap="infoSnap"`
 * works is that Vue sets unknown keys on a custom element as DOM properties when the
 * upgraded element already defines them. Written down as a test because the failure mode
 * is silent - an attribute named "snap" holding "() => {...}" would simply never snap.
 */
describe('sl-split-panel snap wiring', () => {
    beforeAll(async () => {
        // split-panel observes its own size on connect; jsdom has no ResizeObserver.
        globalThis.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        } as unknown as typeof ResizeObserver;

        await import('@shoelace-style/shoelace/dist/components/split-panel/split-panel.js');
    });

    it('reaches the element as a function, not as an attribute', () => {
        const { infoSnap, infoPosition } = useAdminPanels();

        const Host = defineComponent({
            setup: () => () => h('sl-split-panel', { position: infoPosition.value, snap: infoSnap }),
        });

        const root = document.createElement('div');
        document.body.appendChild(root);
        const app = createApp(Host);
        app.config.compilerOptions.isCustomElement = (tag: string) => tag.startsWith('sl-');
        app.mount(root);

        const el = root.querySelector('sl-split-panel') as HTMLElement & {
            snap: unknown;
            position: number;
        };

        expect(typeof el.snap).toBe('function');
        expect(el.snap).toBe(infoSnap);
        expect(el.getAttribute('snap')).toBeNull();
        // Numbers survive the same path, so a collapsed pane really is position 0.
        expect(el.position).toBe(0);

        app.unmount();
    });
});
