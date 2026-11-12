import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * useAdminPanels keeps its state at module scope so that BookDetailView's panes and the
 * toolbars' toggles share one truth. Each case therefore re-imports the module to get a
 * fresh set of refs rather than leaking a previous case's geometry.
 */
type Panels = ReturnType<typeof import('./useAdminPanels')['useAdminPanels']>;

async function freshPanels(): Promise<Panels> {
    vi.resetModules();
    const { useAdminPanels } = await import('./useAdminPanels');
    return useAdminPanels();
}

let panels: Panels;

beforeEach(async () => {
    panels = await freshPanels();
});

describe('useAdminPanels defaults', () => {
    it('starts with both panes shut', () => {
        expect(panels.infoOpen.value).toBe(false);
        expect(panels.toolsOpen.value).toBe(false);
        expect(panels.infoPosition.value).toBe(0);
        // The inner panel's position is measured from the section content, so 100 is shut.
        expect(panels.toolsPosition.value).toBe(100);
    });

    it('opens each pane at its default width', () => {
        panels.toggleInfo();
        panels.toggleTools();

        expect(panels.infoPosition.value).toBe(20);
        expect(panels.toolsPosition.value).toBe(75);
    });
});

describe('snap bands', () => {
    const size = 1000;
    const snapArgs = { size, snapThreshold: 12, isRtl: false, vertical: false };

    it('snaps the info pane shut from inside 50px', () => {
        expect(panels.infoSnap({ pos: 0, ...snapArgs })).toBe(0);
        expect(panels.infoSnap({ pos: 49, ...snapArgs })).toBe(0);
    });

    it('pins the info pane at 100px across the unusable band', () => {
        expect(panels.infoSnap({ pos: 50, ...snapArgs })).toBe(100);
        expect(panels.infoSnap({ pos: 99, ...snapArgs })).toBe(100);
    });

    it('leaves the info pane alone once it is wide enough', () => {
        expect(panels.infoSnap({ pos: 100, ...snapArgs })).toBeNull();
        expect(panels.infoSnap({ pos: 350, ...snapArgs })).toBeNull();
    });

    it('mirrors the bands for the tools pane, whose width is what is left over', () => {
        // 1px of pane left: shut.
        expect(panels.toolsSnap({ pos: 999, ...snapArgs })).toBe(1000);
        // 60px of pane: pinned to a 100px pane, i.e. a divider at 900.
        expect(panels.toolsSnap({ pos: 940, ...snapArgs })).toBe(900);
        // 250px of pane: free.
        expect(panels.toolsSnap({ pos: 750, ...snapArgs })).toBeNull();
    });
});

describe('reading a dragged position back', () => {
    /** An sl-reposition straight from the panel the handler is bound to. */
    function reposition(position: number) {
        const target = { position };
        return { target, currentTarget: target } as unknown as Event;
    }

    /** The same event after bubbling up from the inner panel to the outer one. */
    function bubbledReposition(position: number) {
        return { target: { position }, currentTarget: { position: 0 } } as unknown as Event;
    }

    it('treats a drag to the edge as a collapse', () => {
        panels.toggleInfo();
        panels.onInfoReposition(reposition(0));

        expect(panels.infoOpen.value).toBe(false);
        expect(panels.infoPosition.value).toBe(0);
    });

    it('reopens at the width it was last dragged to, not the default', () => {
        panels.onInfoReposition(reposition(34));
        expect(panels.infoOpen.value).toBe(true);

        panels.toggleInfo();
        expect(panels.infoOpen.value).toBe(false);

        panels.toggleInfo();
        expect(panels.infoPosition.value).toBe(34);
    });

    it('clamps a remembered width that would reopen into the unusable band', () => {
        // A pane dragged to 100px on a very wide screen remembers a tiny percentage.
        panels.onInfoReposition(reposition(3));
        panels.toggleInfo();
        panels.toggleInfo();

        expect(panels.infoPosition.value).toBe(8);
    });

    // sl-reposition bubbles, and the tools panel is nested in the info panel's end slot.
    it('ignores a reposition that only bubbled through', () => {
        panels.onInfoReposition(bubbledReposition(75));

        expect(panels.infoOpen.value).toBe(false);
        expect(panels.infoPosition.value).toBe(0);
    });

    it('tracks the tools pane by its own width, not the divider position', () => {
        panels.onToolsReposition(reposition(70));

        expect(panels.toolsOpen.value).toBe(true);
        expect(panels.toolsPosition.value).toBe(70);

        panels.onToolsReposition(reposition(100));
        expect(panels.toolsOpen.value).toBe(false);
    });
});
