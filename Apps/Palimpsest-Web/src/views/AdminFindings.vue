<template>
  <div class="admin-findings">
    <FindingCandidateOverview v-if="isStaff" />

    <!-- The router gates /admin on being signed in, not on being staff, and the
         decision endpoints are IsAdminUser server-side. Saying so here is better than
         three columns of 403s. -->
    <sl-alert v-else variant="warning" open>
      <sl-icon slot="icon" name="shield-lock"></sl-icon>
      <strong>Librarians only</strong><br />
      Adjudicating identity matches needs a staff account.
    </sl-alert>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '../composables/useAuth';
import FindingCandidateOverview from '../components/admin/FindingCandidateOverview.vue';

/**
 * Route target for /admin/findings. A wrapper on purpose: the work area is a component
 * so that the chip's deep link, and anything else that wants it later, addresses one
 * screen rather than a route.
 */

const { isStaff } = useAuth();
</script>

<style scoped>
.admin-findings {
  height: 100%;
  min-height: 0;
}
</style>
