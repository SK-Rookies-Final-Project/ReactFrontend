import { useEffect, useRef, useState } from 'react'

export function usePoll<T>(fn: (signal?: AbortSignal) => Promise<T>, intervalMs: number) {
  const [data, setData] = useState<T | undefined>()
  const [error, setError] = useState<Error | null>(null)
  const timer = useRef<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const tick = async () => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      try {
        const res = await fn(ac.signal)
        setData(res as T)
        setError(null)
      } catch (err) {
        // AbortError는 무시 (정상적인 취소)
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        setError(err instanceof Error ? err : new Error(String(err)))
        /* 화면에선 이전 값 유지 */
      } finally {
        timer.current = window.setTimeout(tick, intervalMs)
      }
    }
    tick()
    return () => {
      abortRef.current?.abort()
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [fn, intervalMs])

  return { data, error }
}
