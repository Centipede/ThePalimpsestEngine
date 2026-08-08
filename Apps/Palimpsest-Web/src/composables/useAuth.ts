import { computed, readonly, ref } from 'vue';

const TOKEN_KEY = 'palimpsest_token';
const STAFF_KEY = 'palimpsest_is_staff';

const _token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
const _isStaff = ref<boolean>(localStorage.getItem(STAFF_KEY) === 'true');

export function useAuth() {
  const isAuthenticated = computed(() => _token.value !== null);

  async function login(username: string, password: string): Promise<void> {
    const body = new URLSearchParams({ username, password });
    const res = await fetch('/testbooks/api/v1/auth/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _token.value = data.token;
    _isStaff.value = data.is_staff;
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(STAFF_KEY, String(data.is_staff));
  }

  function logout() {
    _token.value = null;
    _isStaff.value = false;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STAFF_KEY);
  }

  return {
    token: readonly(_token),
    isStaff: readonly(_isStaff),
    isAuthenticated,
    login,
    logout,
  };
}
