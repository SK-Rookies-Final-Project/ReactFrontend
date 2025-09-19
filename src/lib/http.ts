// src/lib/http.ts
import { API_CONFIG } from '../config/api';

async function request<T = any>(
  path: string,
  init?: RequestInit & { expect?: 'json' | 'text' }
): Promise<T> {
  // 로컬 스토리지에서 JWT 토큰 가져오기
  const token = localStorage.getItem('auth_token');
  
  const res = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    credentials: 'include', // 세션/쿠키 쓰면 유지
    ...init,
    headers: {
      'Content-Type': 'application/json',
      // JWT 토큰이 있으면 Authorization 헤더에 추가
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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