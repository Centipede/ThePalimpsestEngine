<template>
  <!-- Staff: a real link, so the work area is one click and one new tab away. -->
  <a
    v-if="href"
    class="chip chip--link"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :title="staffTooltip"
    @click.stop="onClick"
    @keydown.stop
  >
    <span class="chip__body">(<strong class="chip__compared">{{ counts!.compared }}</strong
      >/<span class="chip__triage">{{ counts!.triage }}</span>)</span>
  </a>

  <!-- Everyone else: the same figures, nothing to press. -->
  <span v-else-if="visible" class="chip" :title="chipTooltip(counts)">
    <span class="chip__body">(<strong class="chip__compared">{{ counts!.compared }}</strong
      >/<span class="chip__triage">{{ counts!.triage }}</span>)</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { CandidateCounts } from '../../../types/identityMatches';
import {
  candidateChipLink,
  chipTooltip,
  hasCandidates,
} from '../../../utils/findingCandidateQuery';

/**
 * `Leopold I (3/72)` - how many identity matches the background scan is holding for
 * this finding. 3 scored by the close-reading pass, 72 from the nightly coarse one.
 *
 * Shown to ordinary readers as well as staff, deliberately: the spec wants a reader able
 * to notice that the system has spotted something and say so to a librarian. For them it
 * is text with a tooltip and nothing to click, because there is no endpoint behind
 * "please tie these together" and an affordance that did nothing would be a lie. Staff
 * get the same chip as a link into the work area.
 */

const props = defineProps<{
  counts?: CandidateCounts | null;
  isStaff: boolean;
}>();

const router = useRouter();

/**
 * Nothing at all when the scan has found nothing. A section the scan has not reached
 * must look exactly as it did before this component existed, so this is a v-if on the
 * whole chip rather than a "0/0".
 */
const visible = computed(() => hasCandidates(props.counts));

const query = computed(() => (props.isStaff ? candidateChipLink(props.counts) : null));

/**
 * Resolved rather than pushed, so the chip is an ordinary anchor: middle-click,
 * ctrl-click and "open in new tab" all work without any handling of our own. The idiom
 * TableOfContents already uses for its badges.
 *
 * Null - and so the inert rendering, even for staff - whenever candidateChipLink
 * declines to produce a target.
 */
const href = computed(() => {
  if (!visible.value || !query.value) return null;
  return router.resolve({ path: '/admin/findings', query: query.value }).href;
});

const staffTooltip = computed(() => {
  const counts = props.counts;
  if (!counts) return '';
  return `${counts.compared} strong and ${counts.triage} coarse candidate matches. `
    + 'Open the match work area.';
});

/**
 * The anchor already carries target="_blank", so the browser would open a tab on its
 * own. This exists for the modifier cases: handing those back to the browser untouched
 * keeps ctrl-click and middle-click behaving as the reader expects, and the plain click
 * is cancelled only so the new tab comes from one place.
 *
 * Note what is NOT here: `.prevent` on the template binding. That would cancel every
 * click including the modified ones and break the link outright. `.stop` is required
 * though - sl-details binds click on its shadow <summary>, an ancestor of this slot in
 * the flattened tree, so without it opening the work area would also toggle the finding.
 */
function onClick(event: MouseEvent) {
  if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.button !== 0) {
    return;
  }
  event.preventDefault();
  if (href.value) window.open(href.value, '_blank', 'noopener');
}
</script>

<style scoped>
.chip {
  flex-shrink: 0;
  font-size: 0.65rem;
  line-height: 1;
  color: var(--color-text-muted);
  white-space: nowrap;
  /* Lifted a touch: at this size the parentheses sit low against the name. */
  position: relative;
  top: -0.05em;
}

.chip--link {
  text-decoration: none;
  border-radius: var(--sl-border-radius-small);
  padding: 0.1rem 0.15rem;
  margin: -0.1rem -0.15rem;
}

.chip--link:hover {
  background-color: var(--sl-color-primary-100);
  color: var(--sl-color-primary-700);
}

.chip__compared {
  font-weight: 700;
  color: var(--sl-color-primary-700);
}

.chip--link:hover .chip__compared {
  color: var(--sl-color-primary-800);
}

.chip__triage {
  color: var(--color-text-dimmed);
  font-style: italic;
}
</style>
