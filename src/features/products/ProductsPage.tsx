import { CaretLeft, CaretRight, MagnifyingGlass, Package, Plus, WarningCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import type { Product } from '@/api/types'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InputField } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { ProductDeleteDialog } from './ProductDeleteDialog'
import { ProductFormDialog } from './ProductFormDialog'
import { ProductsTable } from './ProductsTable'
import { VisibilityConfigCard } from './VisibilityConfigCard'
import { useProductsConfigQuery, useProductsQuery } from './hooks'

const PAGE_SIZE = 20

export function ProductsPage() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 350)
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  const productsQuery = useProductsQuery(page, search)
  const configQuery = useProductsConfigQuery()

  const totalPages = productsQuery.data ? Math.max(1, Math.ceil(productsQuery.data.count / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="Productos"
        description="Catálogo que el bot puede ofrecer a tus clientes."
        actions={
          <Button onClick={() => setEditingProduct(null)}>
            <Plus size={16} weight="bold" />
            Nuevo producto
          </Button>
        }
      />

      <div className="mb-8">
        <VisibilityConfigCard />
      </div>

      <div className="mb-5 max-w-sm">
        <InputField
          icon={MagnifyingGlass}
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            setPage(1)
          }}
          placeholder="Buscar por nombre..."
          aria-label="Buscar productos"
        />
      </div>

      {productsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : productsQuery.isError ? (
        <EmptyState
          icon={WarningCircle}
          title="No pudimos cargar los productos"
          description="Revisá tu conexión e intentá de nuevo."
          action={
            <Button variant="secondary" size="sm" onClick={() => void productsQuery.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : productsQuery.data && productsQuery.data.results.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No hay productos en el catálogo."
          description={search ? 'Probá con otro término de búsqueda.' : 'Agregá el primero con el botón de arriba.'}
        />
      ) : (
        productsQuery.data && (
          <>
            <ProductsTable
              products={productsQuery.data.results}
              visibleFields={configQuery.data?.agent_visible_fields ?? []}
              onEdit={setEditingProduct}
              onDelete={setDeletingProduct}
            />

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between text-[13px] text-ink-muted">
                <span>
                  Página {page} de {totalPages} · {productsQuery.data.count} productos
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  >
                    <CaretLeft size={16} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Página siguiente"
                  >
                    <CaretRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )
      )}

      <ProductFormDialog
        open={editingProduct !== undefined}
        onOpenChange={(open) => !open && setEditingProduct(undefined)}
        product={editingProduct ?? null}
      />
      <ProductDeleteDialog product={deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)} />
    </div>
  )
}
