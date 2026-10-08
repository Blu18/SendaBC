export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_IP

// timeoutMs: si el servidor no responde en ese tiempo se aborta la petición y fetch
// rechaza. Sin él, un backend inalcanzable puede tardar más de un minuto en fallar.
export async function apiFetch(path: string, token: string | null, init: RequestInit = {}, timeoutMs?: number) {
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      ...(controller ? { signal: controller.signal } : {}),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
