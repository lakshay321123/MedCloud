'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api, ApiListParams, MedCloudApiError } from '@/lib/api-client'

export interface UseApiOptions<T> {
  skip?: boolean
  pollInterval?: number
  initialData?: T
}

export interface UseApiResult<T> {
  data: T | undefined
  loading: boolean
  error: MedCloudApiError | null
  refetch: () => void
  mutate: (data: T) => void
}

export function useApi<T>(
  path: string,
  params?: ApiListParams,
  options?: UseApiOptions<T>
): UseApiResult<T> {
  const [data, setData] = useState<T | undefined>(options?.initialData)
  const [loading, setLoading] = useState(!options?.skip && !options?.initialData)
  const [error, setError] = useState<MedCloudApiError | null>(null)
  const mountedRef = useRef(true)
  const dataRef = useRef<T | undefined>(options?.initialData)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const paramsKey = JSON.stringify(params)

  const fetchData = useCallback(async () => {
    if (options?.skip) return
    // Only show loading spinner on INITIAL fetch (no data yet).
    // On subsequent fetches (param changes, refetches), keep showing
    // stale data to avoid the page "blinking" blank.
    if (!dataRef.current) setLoading(true)
    setError(null)
    try {
      const result = await api.get<T>(path, params)
      if (mountedRef.current) {
        setData(result)
        dataRef.current = result
        setLoading(false)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof MedCloudApiError ? err : new MedCloudApiError(String(err), 0))
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, options?.skip])

  useEffect(() => {
    mountedRef.current = true
    fetchData()

    if (options?.pollInterval && options.pollInterval > 0) {
      intervalRef.current = setInterval(fetchData, options.pollInterval)
    }

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, options?.pollInterval])

  const mutate = useCallback((newData: T) => {
    setData(newData)
    dataRef.current = newData
  }, [])

  return { data, loading, error, refetch: fetchData, mutate }
}

export interface UseMutationResult<TData, TInput> {
  mutate: (input: TInput) => Promise<TData | null>
  loading: boolean
  error: MedCloudApiError | null
  data: TData | undefined
}

export function useMutation<TData, TInput>(
  method: 'post' | 'put' | 'patch' | 'delete',
  path: string
): UseMutationResult<TData, TInput> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<MedCloudApiError | null>(null)
  const [data, setData] = useState<TData | undefined>()
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const mutate = useCallback(async (input: TInput): Promise<TData | null> => {
    setLoading(true)
    setError(null)
    try {
      let result: TData
      switch (method) {
        case 'post':
          result = await api.post<TData>(path, input)
          break
        case 'put':
          result = await api.put<TData>(path, input)
          break
        case 'patch':
          result = await api.patch<TData>(path, input)
          break
        case 'delete':
          result = await api.delete<TData>(path)
          break
        default:
          throw new MedCloudApiError(`Unsupported mutation method: ${method}`, 0)
      }
      if (mountedRef.current) {
        setData(result)
        setLoading(false)
      }
      return result
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof MedCloudApiError ? err : new MedCloudApiError(String(err), 0))
        setLoading(false)
      }
      return null
    }
  }, [method, path])

  return { mutate, loading, error, data }
}
