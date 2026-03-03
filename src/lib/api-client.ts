import { getAuthToken, refreshToken } from './auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    '[MedCloud] NEXT_PUBLIC_API_URL not set. API calls will fail. ' +
    'Set it in .env.local or Vercel Environment Variables.'
  )
}
const API_PREFIX = '/api/v1'

export interface ApiListParams {
  org_id?: string
  client_id?: string
  limit?: number
  page?: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
  status?: string
  [key: string]: string | number | boolean | undefined
}

export interface ApiListMeta {
  total: number
  page?: number
  limit?: number
  hasMore?: boolean
}

export interface ApiListResponse<T> {
  data: T[]
  meta: ApiListMeta
}

export class MedCloudApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'MedCloudApiError'
    this.status = status
    this.code = code
  }
}

function buildUrl(path: string, params?: ApiListParams): string {
  const url = new URL(API_BASE + API_PREFIX + path)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v))
      }
    })
  }
  return url.toString()
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function request<T>(
  method: string,
  path: string,
  params?: ApiListParams,
  body?: unknown,
  retryCount = 0
): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = buildUrl(path, method === 'GET' ? params : undefined)
  const options: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }

  let res: Response
  try {
    res = await fetch(url, options)
  } catch (err) {
    throw new MedCloudApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
      'NETWORK_ERROR'
    )
  }

  // 401 — try token refresh once
  if (res.status === 401 && retryCount === 0) {
    const newToken = await refreshToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      return request<T>(method, path, params, body, 1)
    }
  }

  // 429 — exponential backoff (max 2 retries)
  if (res.status === 429 && retryCount < 2) {
    await sleep(Math.pow(2, retryCount + 1) * 1000)
    return request<T>(method, path, params, body, retryCount + 1)
  }

  // 5xx — retry twice
  if (res.status >= 500 && retryCount < 2) {
    await sleep(Math.pow(2, retryCount + 1) * 1000)
    return request<T>(method, path, params, body, retryCount + 1)
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    let code: string | undefined
    try {
      const errBody = await res.json()
      message = errBody.error || errBody.message || message
      code = errBody.code
    } catch {
      // ignore parse errors
    }
    throw new MedCloudApiError(message, res.status, code)
  }

  return res.json() as Promise<T>
}

export const api = {
  get<T>(path: string, params?: ApiListParams): Promise<T> {
    return request<T>('GET', path, params)
  },

  post<T>(path: string, body: unknown, params?: ApiListParams): Promise<T> {
    return request<T>('POST', path, params, body)
  },

  put<T>(path: string, body: unknown, params?: ApiListParams): Promise<T> {
    return request<T>('PUT', path, params, body)
  },

  patch<T>(path: string, body: unknown, params?: ApiListParams): Promise<T> {
    return request<T>('PATCH', path, params, body)
  },

  delete<T>(path: string, params?: ApiListParams): Promise<T> {
    return request<T>('DELETE', path, params)
  },

  health(): Promise<{ status: string; database: string; time: string; tables: number; version: string }> {
    return request('GET', '/health')
  },
}
