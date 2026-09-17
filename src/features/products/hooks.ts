import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  fetchProductsConfig,
  updateProduct,
  updateProductsConfig,
  type ProductFormValues,
} from '@/api/products'
import type { ProductsConfig } from '@/api/types'

const PAGE_SIZE = 20

export function useProductsQuery(page: number, search: string) {
  return useQuery({
    queryKey: ['products', { page, search }],
    queryFn: ({ signal }) => fetchProducts({ page, pageSize: PAGE_SIZE, search: search || undefined }, signal),
    placeholderData: keepPreviousData,
  })
}

export function useProductsConfigQuery() {
  return useQuery({
    queryKey: ['products', 'config'],
    queryFn: fetchProductsConfig,
  })
}

export function useUpdateProductsConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: ProductsConfig) => updateProductsConfig(config),
    onSuccess: (data) => {
      queryClient.setQueryData(['products', 'config'], data)
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ProductFormValues) => createProduct(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
    },
  })
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ProductFormValues) => updateProduct(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'], exact: false })
    },
  })
}
