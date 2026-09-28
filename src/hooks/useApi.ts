import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => Promise<void>
}

/**
 * Lightweight data-fetching hook.
 *
 * @param fetcher  async function that returns the data
 * @param deps    dependency array — refetches when any value changes (pass `null` to skip auto-fetch)
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] | null = [],
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: deps !== null,
    error: null,
  })

  // Keep fetcher ref stable to avoid re-triggering on every render
  const generation = useRef(0)
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const refetch = useCallback(async () => {
    const request = ++generation.current
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const data = await fetcherRef.current()
      if (request === generation.current) setState({ data, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      if (request === generation.current) setState(prev => ({ ...prev, loading: false, error: message }))
    }
  }, [])

  const cancelPending = useCallback(() => { generation.current++ }, [])

  useEffect(() => {
    if (deps === null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
    return cancelPending
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps === null ? [] : deps)

  return { ...state, refetch }
}
