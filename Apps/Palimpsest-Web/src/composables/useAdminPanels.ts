import { computed, ref } from 'vue';

/**
 * Open/closed state and geometry of the two staff admin panes that BookDetailView
 * hosts in its nested sl-split-panels: the info pane on the left (`.admin-info-portal`)
 * and the tools pane on the right (`.admin-tools-portal`).
 *
 * The state is module-scoped on purpose. The panes live in BookDetailView while the
 * toggles that drive them sit in the toolbars of BookDetailView *and* SectionDetailView,
 * which is a router-view child - sharing one ref beats threading props through the route.
 * Nothing is persisted: the usual work in a section is editing facets and findings, so
 * every reload starts with both panes shut.
 *
 * The dividers themselves are never disabled or hidden. A collapsed pane parks its
 * divider against the edge, from where it can be dragged back open.
 */

/** Shoelace's SnapFunction contract, declared here rather than imported from its dist tree. */
interface SnapParams {
  /** The position the divider has been dragged to, in pixels. */
  pos: number;
  /** The size of the split-panel across its primary axis, in pixels. */
  size: number;
  snapThreshold: number;
  isRtl: boolean;
  vertical: boolean;
}

/** Returning null means "no snap point near here, keep the dragged position". */
type SnapFunction = (params: SnapParams) => number | null;

/**
 * Below this the pane's own content stops making sense: the job rows, the badge
 * groups and the checkbox lists all need room, and around 50-70px the scrollbar
 * starts eating what is left.
 */
const MIN_PANE_PX = 100;

/** Drag the divider inside this of the edge and the pane snaps shut instead. */
const COLLAPSE_PX = 50;

/**
 * Floor for a remembered width. A pane dragged to exactly MIN_PANE_PX on a wide
 * screen remembers a very small percentage; on a narrower screen that same
 * percentage would reopen into the unusable band, so the reopen clamps.
 */
const MIN_PANE_PCT = 8;

const DEFAULT_INFO_PCT = 20;
const DEFAULT_TOOLS_PCT = 25;

const infoOpen = ref(false);
const toolsOpen = ref(false);

/** Width of the outer panel's start pane, as a percentage of the outer panel. */
const infoWidthPct = ref(DEFAULT_INFO_PCT);
/** Width of the inner panel's end pane, as a percentage of the inner panel. */
const toolsWidthPct = ref(DEFAULT_TOOLS_PCT);

/** The outer panel's position is the info pane's own width. */
const infoPosition = computed(() => (infoOpen.value ? infoWidthPct.value : 0));

/**
 * The inner panel's position is measured from its start (the section content), so the
 * tools pane occupies whatever is left over - and a position of 100 closes it.
 */
const toolsPosition = computed(() => (toolsOpen.value ? 100 - toolsWidthPct.value : 100));

/** A width worth remembering: anything the snap function would have refused is ignored. */
function rememberedWidth(pct: number): number {
  return Math.max(pct, MIN_PANE_PCT);
}

/**
 * Fed from `sl-reposition`. Dragging the divider to the edge is itself a collapse, so the
 * open flag follows the geometry rather than the other way round.
 */
export function readInfoPosition(pos: number) {
  infoOpen.value = pos > 0;
  if (pos > 0) infoWidthPct.value = pos;
}

export function readToolsPosition(pos: number) {
  toolsOpen.value = pos < 100;
  if (pos < 100) toolsWidthPct.value = 100 - pos;
}

/**
 * Three bands: shut, pinned at the minimum useful width, and free. The middle band is
 * what keeps the divider out of the 1-100px range where the pane's contents break down.
 */
const infoSnap: SnapFunction = ({ pos }) => {
  if (pos < COLLAPSE_PX) return 0;
  if (pos < MIN_PANE_PX) return MIN_PANE_PX;
  return null;
};

/** The same bands mirrored: the end pane's width is what is left after `pos`. */
const toolsSnap: SnapFunction = ({ pos, size }) => {
  const paneWidth = size - pos;
  if (paneWidth < COLLAPSE_PX) return size;
  if (paneWidth < MIN_PANE_PX) return size - MIN_PANE_PX;
  return null;
};

export function useAdminPanels() {
  function toggleInfo() {
    if (!infoOpen.value) infoWidthPct.value = rememberedWidth(infoWidthPct.value);
    infoOpen.value = !infoOpen.value;
  }

  function toggleTools() {
    if (!toolsOpen.value) toolsWidthPct.value = rememberedWidth(toolsWidthPct.value);
    toolsOpen.value = !toolsOpen.value;
  }

  /**
   * `sl-reposition` carries nothing, so the new position is read off the panel itself -
   * but the event bubbles, and the tools panel sits in the info panel's `end` slot. Left
   * ungated, dragging the tools divider would arrive here too and throw the info pane open
   * at the tools pane's position, so anything that merely passed through is dropped.
   */
  function panelPosition(event: Event): number | null {
    if (event.target !== event.currentTarget) return null;
    return (event.target as HTMLElement & { position: number }).position;
  }

  function onInfoReposition(event: Event) {
    const pos = panelPosition(event);
    if (pos !== null) readInfoPosition(pos);
  }

  function onToolsReposition(event: Event) {
    const pos = panelPosition(event);
    if (pos !== null) readToolsPosition(pos);
  }

  return {
    infoOpen,
    toolsOpen,
    infoPosition,
    toolsPosition,
    infoSnap,
    toolsSnap,
    toggleInfo,
    toggleTools,
    onInfoReposition,
    onToolsReposition,
  };
}
