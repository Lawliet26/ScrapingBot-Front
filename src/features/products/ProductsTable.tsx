import { Image as ImageIcon, PencilSimple, Trash } from '@phosphor-icons/react'
import type { AgentVisibleField, Product } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatPesos } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ProductsTableProps {
  products: Product[]
  visibleFields: AgentVisibleField[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

function FieldVisibilityBadge({ field, visibleFields }: { field: AgentVisibleField; visibleFields: AgentVisibleField[] }) {
  const isVisible = visibleFields.includes(field)
  return <Badge tone={isVisible ? 'success' : 'neutral'}>{isVisible ? 'agente' : 'solo admin'}</Badge>
}

function ProductThumb({ product, className }: { product: Product; className?: string }) {
  if (product.imagen_url) {
    return <img src={product.imagen_url} alt={product.nombre} className={cn('shrink-0 rounded-xl object-cover neu-raised-sm', className)} />
  }
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-xl bg-canvas text-ink-faint neu-inset-sm', className)}>
      <ImageIcon size={20} />
    </div>
  )
}

function RowActions({ product, onEdit, onDelete }: Pick<ProductsTableProps, 'onEdit' | 'onDelete'> & { product: Product }) {
  return (
    <div className="flex justify-end gap-1.5">
      <Button variant="ghost" size="icon-sm" onClick={() => onEdit(product)} title="Editar" aria-label={`Editar ${product.nombre}`}>
        <PencilSimple size={16} />
      </Button>
      <Button
        variant="danger-ghost"
        size="icon-sm"
        onClick={() => onDelete(product)}
        title="Eliminar"
        aria-label={`Eliminar ${product.nombre}`}
      >
        <Trash size={16} />
      </Button>
    </div>
  )
}

export function ProductsTable({ products, visibleFields, onEdit, onDelete }: ProductsTableProps) {
  return (
    <>
      {/* Desktop: tabla completa */}
      <Card padding="none" className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-ink-faint">
              <th className="px-5 py-4 font-semibold">Producto</th>
              <th className="px-5 py-4 font-semibold">Descripción</th>
              <th className="px-5 py-4 font-semibold">Precio</th>
              <th className="px-5 py-4 font-semibold">Ofertas</th>
              <th className="px-5 py-4 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {products.map((product) => (
              <tr key={product.id} className="align-top transition-colors hover:bg-surface/40">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <ProductThumb product={product} className="size-12" />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="font-medium text-ink">{product.nombre}</span>
                      <FieldVisibilityBadge field="nombre" visibleFields={visibleFields} />
                    </div>
                  </div>
                </td>
                <td className="max-w-xs px-5 py-4">
                  <div className="flex flex-col items-start gap-1.5">
                    <p className="line-clamp-3 whitespace-pre-line text-ink-muted" title={product.descripcion || undefined}>
                      {product.descripcion || '—'}
                    </p>
                    <FieldVisibilityBadge field="descripcion" visibleFields={visibleFields} />
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="font-mono text-[15px] font-medium text-ink">${formatPesos(product.precio)}</span>
                    <FieldVisibilityBadge field="precio" visibleFields={visibleFields} />
                  </div>
                </td>
                <td className="px-5 py-4 text-ink-muted">{product.ofertas_summary}</td>
                <td className="px-5 py-4">
                  <RowActions product={product} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Mobile/tablet: una tarjeta por producto */}
      <div className="space-y-4 lg:hidden">
        {products.map((product) => (
          <Card key={product.id} padding="sm" className="flex gap-4">
            <ProductThumb product={product} className="size-16" />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{product.nombre}</span>
                  <FieldVisibilityBadge field="nombre" visibleFields={visibleFields} />
                </div>
                <RowActions product={product} onEdit={onEdit} onDelete={onDelete} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[15px] font-medium text-ink">${formatPesos(product.precio)}</span>
                <FieldVisibilityBadge field="precio" visibleFields={visibleFields} />
              </div>

              {product.descripcion && (
                <div className="flex items-start gap-2">
                  <p className="line-clamp-2 whitespace-pre-line text-[13px] text-ink-muted">{product.descripcion}</p>
                  <FieldVisibilityBadge field="descripcion" visibleFields={visibleFields} />
                </div>
              )}

              <p className="text-[13px] text-ink-muted">{product.ofertas_summary}</p>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
