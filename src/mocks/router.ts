import type { FieldError } from '@/api/client'

export interface MockResponse {
  status: number
  body?: unknown
  errors?: FieldError[]
  detail?: string
}

export interface MockContext {
  params: Record<string, string>
  query: URLSearchParams
  /** JSON parseado o FormData, según cómo lo envió el cliente. */
  body: unknown
}

export type MockHandler = (ctx: MockContext) => MockResponse | Promise<MockResponse>

interface Route {
  method: string
  pattern: RegExp
  keys: string[]
  handler: MockHandler
}

const routes: Route[] = []

/** Registra un handler para `METHOD /path/:param/`. Los `:param` quedan en `ctx.params`. */
export function route(method: string, path: string, handler: MockHandler) {
  const keys: string[] = []
  const source = path.replace(/:([a-zA-Z_]+)/g, (_, key: string) => {
    keys.push(key)
    return '([^/]+)'
  })
  routes.push({ method, pattern: new RegExp(`^${source}$`), keys, handler })
}

export const ok = (body?: unknown): MockResponse => ({ status: 200, body })
export const created = (body: unknown): MockResponse => ({ status: 201, body })
export const noContent = (): MockResponse => ({ status: 204 })
export const notFound = (detail = 'No encontrado.'): MockResponse => ({ status: 404, errors: [], detail })
export const badRequest = (errors: FieldError[]): MockResponse => ({ status: 400, errors })

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function dispatch(method: string, fullPath: string, body: unknown): Promise<MockResponse> {
  const [path, qs = ''] = fullPath.split('?')
  const query = new URLSearchParams(qs)

  for (const r of routes) {
    if (r.method !== method) continue
    const match = r.pattern.exec(path)
    if (!match) continue
    const params: Record<string, string> = {}
    r.keys.forEach((key, i) => {
      params[key] = decodeURIComponent(match[i + 1])
    })
    // Latencia simulada para que skeletons y spinners se vean como en producción.
    await delay(180 + Math.random() * 320)
    return r.handler({ params, query, body })
  }

  console.warn(`[mock] sin handler para ${method} ${path}`)
  return notFound(`Mock: ruta no implementada (${method} ${path})`)
}

/** Lee un campo de FormData o de un objeto JSON indistintamente. */
export function field(body: unknown, name: string): string {
  if (body instanceof FormData) {
    const value = body.get(name)
    return typeof value === 'string' ? value : ''
  }
  if (body && typeof body === 'object') {
    const value = (body as Record<string, unknown>)[name]
    return value == null ? '' : String(value)
  }
  return ''
}

export function paginate<T>(items: T[], query: URLSearchParams, defaultPageSize = 20) {
  const page = Math.max(1, Number.parseInt(query.get('page') ?? '1', 10) || 1)
  const pageSize = Math.max(1, Number.parseInt(query.get('page_size') ?? String(defaultPageSize), 10) || defaultPageSize)
  const start = (page - 1) * pageSize
  return {
    count: items.length,
    next: start + pageSize < items.length ? String(page + 1) : null,
    previous: page > 1 ? String(page - 1) : null,
    results: items.slice(start, start + pageSize),
  }
}
