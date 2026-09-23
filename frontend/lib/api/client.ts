export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_IP

export async function apiFetch(path: string, token: string | null, init: RequestInit = {}) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}
