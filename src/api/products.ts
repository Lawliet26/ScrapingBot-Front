import { api } from './client'
import type { Paginated, Product, ProductsConfig } from './types'

export interface ProductsQuery {
  page?: number
  pageSize?: number
  search?: string
}

function buildQueryString(query: ProductsQuery): string {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('page_size', String(query.pageSize))
  if (query.search) params.set('search', query.search)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchProducts(query: ProductsQuery, signal?: AbortSignal): Promise<Paginated<Product>> {
  return api.get<Paginated<Product>>(`/products/${buildQueryString(query)}`, signal)
}

export async function fetchProduct(id: string): Promise<Product> {
  return api.get<Product>(`/products/${id}/`)
}

export interface ProductFormValues {
  nombre: string
  descripcion: string
  precio: string
  ofertasLines: string
  newImages: File[]
  imagesToRemove: string[]
}

function buildProductFormData(values: ProductFormValues): FormData {
  const form = new FormData()
  form.set('nombre', values.nombre)
  form.set('descripcion', values.descripcion)
  form.set('precio', values.precio)
  form.set('ofertas', values.ofertasLines)
  for (const file of values.newImages) {
    form.append('imagenes', file)
  }
  if (values.imagesToRemove.length > 0) {
    form.set('imagenes_remover', values.imagesToRemove.join(','))
  }
  return form
}

export async function createProduct(values: ProductFormValues): Promise<Product> {
  return api.postForm<Product>('/products/', buildProductFormData(values))
}

export async function updateProduct(id: string, values: ProductFormValues): Promise<Product> {
  return api.patchForm<Product>(`/products/${id}/`, buildProductFormData(values))
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/products/${id}/`)
}

export async function fetchProductsConfig(): Promise<ProductsConfig> {
  return api.get<ProductsConfig>('/products/config/')
}

export async function updateProductsConfig(config: ProductsConfig): Promise<ProductsConfig> {
  return api.put<ProductsConfig>('/products/config/', config)
}
