// src/lib/prom.ts
// Prometheus fetch helper with configurable base URL, small retry, and light concurrency control.
// - Base URL order: localStorage('PROM_BASE') → VITE_PROM_URL → http://localhost:9090
// - Export PROM_BASE so UI can show/edit it.

type Result = { status: string; data: { result: unknown[] } }

// === Base URL resolution ===
// Priority: localStorage > VITE_PROM_BASE env var > default '/prom'
const stored = typeof window !== 'undefined' ? window.localStorage.getItem('PROM_BASE') : null
const envBase = import.meta.env?.VITE_PROM_BASE || ''
export const PROM_BASE: string = stored || envBase || '/prom'

// Export target URL for reference (use proxy path in development)
export const PROM_TARGET: string = import.meta.env?.VITE_PROM_URL || '/prom'

// === Light concurrency guard (avoid flooding Prometheus from the browser) ===
const MAX_CONCURRENCY = 3
const queue: Array<() => Promise<unknown>> = []
let inflight = 0

function pump() {
  while (inflight < MAX_CONCURRENCY && queue.length) {
    const job = queue.shift()!
    inflight++
    job().finally(() => {
      inflight--
      pump()
    })
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(() => fn().then(resolve).catch(reject))
    pump()
  })
}

async function doFetch(url: string, signal?: AbortSignal, tries = 2): Promise<unknown[]> {
  try {
    const r = await fetch(url, { signal, cache: 'no-store', mode: 'cors' })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      throw new Error(`HTTP ${r.status} ${r.statusText} — ${txt.slice(0, 160)}`)
    }
    const json = (await r.json()) as Result
    if ((json as Result).status !== 'success') {
      throw new Error(`Prometheus error: ${JSON.stringify(json).slice(0, 180)}`)
    }
    return json.data?.result ?? []
  } catch (e) {
    // AbortError는 재시도하지 않고 바로 throw
    
    if (e instanceof Error && e.name === 'AbortError') {
      throw e
    }
    if (tries > 0 && !signal?.aborted) {
      // short backoff then retry
      await new Promise((r) => setTimeout(r, 250))
      return doFetch(url, signal, tries - 1)
    }
    throw e
  }
}

export function promQuery(q: string, signal?: AbortSignal) {
  const url = `${PROM_BASE}/api/v1/query?query=${encodeURIComponent(q)}`
  return enqueue(() => doFetch(url, signal))
}
