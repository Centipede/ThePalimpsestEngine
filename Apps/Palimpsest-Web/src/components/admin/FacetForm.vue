<template>
  <form @submit.prevent="handleSubmit" class="facet-form">
    <sl-input
        label="Name"
        :value="formData.name"
        @sl-input="formData.name = $event.target.value"
        placeholder="e.g. Historical Figures"
        required
        :disabled="isEdit"
    ></sl-input>

    <sl-input
        label="Machine Name (Singular)"
        :value="formData.machine_name_singular"
        @sl-input="formData.machine_name_singular = $event.target.value"
        placeholder="e.g. person"
        required
        :disabled="isEdit"
        :help-text="errors.machine_name_singular"
    ></sl-input>

    <sl-input
        label="Machine Name (Plural)"
        :value="formData.machine_name_plural"
        @sl-input="formData.machine_name_plural = $event.target.value"
        placeholder="e.g. people"
        required
        :disabled="isEdit"
        :help-text="errors.machine_name_plural"
    ></sl-input>

    <sl-input
        label="Symbol"
        :value="formData.symbol"
        @sl-input="formData.symbol = $event.target.value"
        placeholder="e.g. 👤"
        required
        :disabled="isEdit"
    ></sl-input>

    <sl-textarea
        label="Prose Description"
        :value="formData.prose_description"
        @sl-input="formData.prose_description = $event.target.value"
        placeholder="A thorough English description of what this facet represents..."
        required
    ></sl-textarea>

    <div v-if="isEdit" class="warning">
      <sl-alert variant="warning" open>
        <sl-icon slot="icon" name="exclamation-triangle"></sl-icon>
        Changing the description might affect how the LLM interprets this facet.
      </sl-alert>
    </div>

    <footer class="form-actions">
      <sl-button variant="neutral" @click="$emit('cancel')">Cancel</sl-button>
      <sl-button variant="primary" type="submit" :disabled="!isValid">
        {{ isEdit ? 'Save Changes' : 'Create Facet' }}
      </sl-button>
    </footer>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  initialData?: {
    name: string;
    machine_name_singular: string;
    machine_name_plural: string;
    symbol: string;
    prose_description: string | null;
  };
  isEdit?: boolean;
}>();

const emit = defineEmits(['submit', 'cancel']);

const formData = ref({
  name: props.initialData?.name || '',
  machine_name_singular: props.initialData?.machine_name_singular || '',
  machine_name_plural: props.initialData?.machine_name_plural || '',
  symbol: props.initialData?.symbol || '',
  prose_description: props.initialData?.prose_description || '',
});

const errors = ref({
  machine_name_singular: '',
  machine_name_plural: '',
});

const validatePythonIdentifier = (name: string) => {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
};

const isValid = computed(() => {
  if (!formData.value.name || !formData.value.symbol) return false;
  if (!props.isEdit) {
    if (!formData.value.machine_name_singular || !formData.value.machine_name_plural) return false;
    if (!validatePythonIdentifier(formData.value.machine_name_singular)) return false;
    if (!validatePythonIdentifier(formData.value.machine_name_plural)) return false;
  }
  return true;
});

const handleSubmit = () => {
  errors.value.machine_name_singular = '';
  errors.value.machine_name_plural = '';

  if (!props.isEdit) {
    if (!validatePythonIdentifier(formData.value.machine_name_singular)) {
      errors.value.machine_name_singular = 'Must be a valid Python identifier (letters, numbers, underscores, starting with a letter or underscore).';
      return;
    }
    if (!validatePythonIdentifier(formData.value.machine_name_plural)) {
      errors.value.machine_name_plural = 'Must be a valid Python identifier.';
      return;
    }
  }

  emit('submit', { ...formData.value });
};
</script>

<style scoped>
.facet-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.warning {
  margin-top: 0.5rem;
}
</style>


