import { useAuth } from './composables/useAuth';

export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const { token } = useAuth();
  const headers = new Headers(init.headers);
  if (token.value) {
    headers.set('Authorization', `Token ${token.value}`);
  }
  return fetch(url, { ...init, headers });
}
