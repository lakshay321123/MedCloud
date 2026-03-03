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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const paramsKey = JSON.stringify(params)

  const fetchData = useCallback(async () => {
    if (options?.skip) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<T>(path, params)
      if (mountedRef.current) {
        setData(result)
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
      const result = await (api[method] as (path: string, body?: unknown) => Promise<TData>)(path, input)
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
