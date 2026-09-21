import type { AgentVisibleField, Oferta, Product, ProductsConfig } from '@/api/types'
import { formatOfertasSummary } from '@/lib/format'
import { INITIAL_PRODUCTS_CONFIG, buildProducts } from '../data/products'
import { badRequest, created, field, noContent, notFound, ok, paginate, route } from '../router'

let products: Product[] = buildProducts()
let config: ProductsConfig = { ...INITIAL_PRODUCTS_CONFIG }
let nextId = products.length + 1

function parseOfertas(lines: string): Oferta[] {
  return lines
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [cantidad, total] = l.split('=').map((v) => Number.parseInt(v.trim(), 10))
      return { cantidad, total }
    })
    .filter((o) => Number.isFinite(o.cantidad) && Number.isFinite(o.total))
}

/** Convierte el multipart del formulario en un Product (parcial para PATCH). */
function productFromForm(body: unknown, current?: Product): Omit<Product, 'id' | 'created_at' | 'updated_at'> {
  const form = body instanceof FormData ? body : new FormData()
  const nombre = field(form, 'nombre') || current?.nombre || ''
  const descripcion = field(form, 'descripcion') || current?.descripcion || ''
  const precio = Number.parseFloat(field(form, 'precio') || current?.precio || '0')
  const ofertas = form.has('ofertas') ? parseOfertas(field(form, 'ofertas')) : (current?.ofertas ?? [])

  const toRemove = new Set(field(form, 'imagenes_remover').split(',').filter(Boolean))
  const kept = (current?.imagenes ?? []).filter((url) => !toRemove.has(url))
  // Las imágenes nuevas se muestran con un object URL local: no salen del navegador.
  const added = form
    .getAll('imagenes')
    .filter((f): f is File => f instanceof File)
    .map((f) => URL.createObjectURL(f))
  const imagenes = [...kept, ...added]

  return {
    nombre,
    descripcion,
    precio: precio.toFixed(2),
    ofertas,
    ofertas_summary: formatOfertasSummary(ofertas),
    imagenes,
    imagen_url: imagenes[0] ?? '',
  }
}

function validate(data: { nombre: string; precio: string }) {
  const errors = []
  if (!data.nombre.trim()) errors.push({ field: 'nombre', message: 'El nombre es obligatorio.' })
  if (!(Number.parseFloat(data.precio) > 0)) errors.push({ field: 'precio', message: 'Ingresá un precio mayor a cero.' })
  return errors
}

route('GET', '/products/config/', () => ok(config))

route('PUT', '/products/config/', ({ body }) => {
  const fields = (body as Partial<ProductsConfig>)?.agent_visible_fields ?? []
  const allowed: AgentVisibleField[] = ['nombre', 'descripcion', 'precio']
  config = { agent_visible_fields: fields.filter((f): f is AgentVisibleField => allowed.includes(f)) }
  return ok(config)
})

route('GET', '/products/', ({ query }) => {
  const search = (query.get('search') ?? '').trim().toLowerCase()
  const filtered = search ? products.filter((p) => p.nombre.toLowerCase().includes(search)) : products
  const sorted = [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return ok(paginate(sorted, query))
})

route('GET', '/products/:id/', ({ params }) => {
  const product = products.find((p) => p.id === params.id)
  return product ? ok(product) : notFound()
})

route('POST', '/products/', ({ body }) => {
  const data = productFromForm(body)
  const errors = validate(data)
  if (errors.length) return badRequest(errors)
  const now = new Date().toISOString()
  const product: Product = { id: `prod-${String(nextId++).padStart(3, '0')}`, ...data, created_at: now, updated_at: now }
  products = [product, ...products]
  return created(product)
})

route('PATCH', '/products/:id/', ({ params, body }) => {
  const current = products.find((p) => p.id === params.id)
  if (!current) return notFound()
  const data = productFromForm(body, current)
  const errors = validate(data)
  if (errors.length) return badRequest(errors)
  const updated: Product = { ...current, ...data, updated_at: new Date().toISOString() }
  products = products.map((p) => (p.id === current.id ? updated : p))
  return ok(updated)
})

route('DELETE', '/products/:id/', ({ params }) => {
  if (!products.some((p) => p.id === params.id)) return notFound()
  products = products.filter((p) => p.id !== params.id)
  return noContent()
})
