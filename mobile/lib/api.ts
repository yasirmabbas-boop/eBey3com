import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://ebey3.com/api';

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem('authToken');
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem('authToken', token);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem('authToken');
}

/**
 * Authenticated fetch — equivalent to client/src/lib/api.ts authFetch
 * but uses AsyncStorage instead of localStorage for token persistence.
 */
export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Convenience wrapper for GET requests that parses JSON
 */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await authFetch(path);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Convenience wrapper for POST requests
 */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await authFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
