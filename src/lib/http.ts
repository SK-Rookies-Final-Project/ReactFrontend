// src/lib/http.ts
import { API_CONFIG } from '../config/api';

async function request<T = any>(
  path: string,
  init?: RequestInit & { expect?: 'json' | 'text' }
): Promise<T> {
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    credentials: 'include', // 세션/쿠키 쓰면 유지
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const expect = init?.expect ?? 'json';
  const body = expect === 'json' ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    throw new Error(typeof body === 'string' ? body : (body?.message || `HTTP ${res.status}`));
  }
  return body as T;
}

export const http = {
  get: <T>(p: string) => request<T>(p, { method: 'GET' }),
  post: <T>(p: string, data?: any, expect?: 'json' | 'text') =>
    request<T>(p, { method: 'POST', body: data ? JSON.stringify(data) : undefined, expect }),
  del:  <T>(p: string, expect?: 'json' | 'text') =>
    request<T>(p, { method: 'DELETE', expect }),
};