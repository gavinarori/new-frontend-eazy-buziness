export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `GET ${path} failed with ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body?: any, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = isFormData
    ? (init?.headers || {})
    : { 'Content-Type': 'application/json', ...(init?.headers || {}) };
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `POST ${path} failed with ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body?: any, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = isFormData
    ? (init?.headers || {})
    : { 'Content-Type': 'application/json', ...(init?.headers || {}) };
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `PATCH ${path} failed with ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(path: string, init?: RequestInit): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `DELETE ${path} failed with ${res.status}`);
  }
}

