export const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_IP

// Se llama cuando una petición autenticada responde 401: el token expiró o ya no es válido
// (spec 002, CA-5). La app lo registra en App.tsx para cerrar la sesión.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// timeoutMs: si el servidor no responde en ese tiempo se aborta la petición y fetch
// rechaza. Sin él, un backend inalcanzable puede tardar más de un minuto en fallar.
export async function apiFetch(path: string, token: string | null, init: RequestInit = {}, timeoutMs?: number) {
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      ...(controller ? { signal: controller.signal } : {}),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    // Sin token, un 401 no es de sesión (p. ej. credenciales incorrectas en el login).
    if (token && response.status === 401) onUnauthorized?.();
    return response;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
