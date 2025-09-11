// src/lib/prom.ts
// Prometheus fetch helper with configurable base URL, small retry, and light concurrency control.
// - Base URL order: localStorage('PROM_BASE') → VITE_PROM_BASE → http://localhost:9090
// - Export PROM_BASE so UI can show/edit it.

type Result = { status: string; data: { result: any[] } }

// === Base URL resolution ===
// const stored = typeof window !== 'undefined' ? window.localStorage.getItem('PROM_BASE') : null
// const envBase = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_PROM_BASE) || ''
export const PROM_BASE: string = '/prom'

// === Light concurrency guard (avoid flooding Prometheus from the browser) ===
const MAX_CONCURRENCY = 3
const queue: Array<() => Promise<any>> = []
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

async function doFetch(url: string, signal?: AbortSignal, tries = 2): Promise<any[]> {
  try {
    const r = await fetch(url, { signal, cache: 'no-store', mode: 'cors' })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      throw new Error(`HTTP ${r.status} ${r.statusText} — ${txt.slice(0, 160)}`)
    }
    const json = (await r.json()) as Result
    if ((json as any).status !== 'success') {
      throw new Error(`Prometheus error: ${JSON.stringify(json).slice(0, 180)}`)
    }
    return json.data?.result ?? []
  } catch (e) {
    if (tries > 0) {
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
