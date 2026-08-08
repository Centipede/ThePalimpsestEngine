<template>
  <div class="login-wrap">
    <form class="login-form" @submit.prevent="submit">
      <h1 class="login-form__heading">Palimpsest</h1>

      <div class="login-form__field">
        <label for="username">Username</label>
        <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            required
            :disabled="loading"
        />
      </div>

      <div class="login-form__field">
        <label for="password">Password</label>
        <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            :disabled="loading"
        />
      </div>

      <p v-if="error" class="login-form__error">{{ error }}</p>

      <sl-button type="submit" variant="primary" :loading="loading" style="width: 100%">
        Sign in
      </sl-button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const route = useRoute();
const { login } = useAuth();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await login(username.value, password.value);
    const nextPath = (route.query.next as string) || '/study';
    router.push(nextPath);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 360px;
  padding: 2rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.login-form__heading {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
}

.login-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.login-form__field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.login-form__field input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.login-form__field input:focus {
  border-color: var(--color-accent);
}

.login-form__field input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-form__error {
  margin: 0;
  font-size: 0.875rem;
  color: var(--sl-color-danger-600, #dc2626);
}
</style>
