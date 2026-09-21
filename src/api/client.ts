import Cookies from 'js-cookie'
import { MOCK_API, mockRequest } from '@/mocks'

export class ApiError extends Error {
  status: number
  errors: FieldError[]
  detail?: string

  constructor(status: number, errors: FieldError[], detail?: string) {
    super(detail ?? errors[0]?.message ?? `Error de API (${status})`)
    this.status = status
    this.errors = errors
    this.detail = detail
  }

  fieldMessage(field: string): string | undefined {
    return this.errors.find((e) => e.field === field)?.message
  }

  get nonFieldMessages(): string[] {
    return this.errors.filter((e) => e.field === '' || e.field === 'non_field_errors').map((e) => e.message)
  }
}

export interface FieldError {
  field: string
  message: string
}

async function parseErrorBody(res: Response): Promise<{ errors: FieldError[]; detail?: string }> {
  try {
    const body = await res.json()
    if (Array.isArray(body?.errors)) {
      return { errors: body.errors as FieldError[], detail: body.detail }
    }
    if (typeof body?.detail === 'string') {
      return { errors: [], detail: body.detail }
    }
    return { errors: [], detail: undefined }
  } catch {
    return { errors: [], detail: undefined }
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  isMultipart?: boolean
  signal?: AbortSignal
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'

  // Único punto de intercepción del mock: mismo contrato de éxito/error que el backend real.
  if (MOCK_API) {
    const res = await mockRequest(method, path, options.body)
    if (res.status === 204) return undefined as T
    if (res.status >= 400) throw new ApiError(res.status, res.errors ?? [], res.detail)
    return res.body as T
  }

  const headers: Record<string, string> = {}

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = Cookies.get('csrftoken')
    if (csrfToken) headers['X-CSRFToken'] = csrfToken
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    if (options.isMultipart) {
      body = options.body as FormData
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(options.body)
    }
  }

  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers,
    body,
    signal: options.signal,
  })

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const { errors, detail } = await parseErrorBody(res)
    throw new ApiError(res.status, errors, detail)
  }

  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form, isMultipart: true }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  putForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'PUT', body: form, isMultipart: true }),
  patchForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'PATCH', body: form, isMultipart: true }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export async function ensureCsrfCookie(): Promise<void> {
  await request('/auth/csrf/', { method: 'GET' })
}
