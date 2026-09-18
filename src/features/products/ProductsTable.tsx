import { Image as ImageIcon, PencilSimple, Trash } from '@phosphor-icons/react'
import type { AgentVisibleField, Product } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { formatPesos } from '@/lib/format'

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

export function ProductsTable({ products, visibleFields, onEdit, onDelete }: ProductsTableProps) {
  return (
    <>
      {/* Desktop: tabla completa */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[12px] uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Imagen</th>
              <th className="px-4 py-3 font-medium">Ofertas</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-ink">{product.nombre}</span>
                    <FieldVisibilityBadge field="nombre" visibleFields={visibleFields} />
                  </div>
                </td>
                <td className="max-w-xs px-4 py-3">
                  <div className="flex items-start gap-2">
                    <p className="line-clamp-3 whitespace-pre-line text-ink-muted" title={product.descripcion || undefined}>
                      {product.descripcion || '—'}
                    </p>
                    <FieldVisibilityBadge field="descripcion" visibleFields={visibleFields} />
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-ink">${formatPesos(product.precio)}</span>
                    <FieldVisibilityBadge field="precio" visibleFields={visibleFields} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  {product.imagen_url ? (
                    <img src={product.imagen_url} alt={product.nombre} className="size-11 rounded-md border border-border object-cover" />
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{product.ofertas_summary}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      className="flex size-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                      title="Editar"
                    >
                      <PencilSimple size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(product)}
                      className="flex size-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                      title="Eliminar"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/tablet: una tarjeta por producto */}
      <div className="divide-y divide-border rounded-xl border border-border bg-surface lg:hidden">
        {products.map((product) => (
          <div key={product.id} className="flex gap-3 p-4">
            {product.imagen_url ? (
              <img src={product.imagen_url} alt={product.nombre} className="size-14 shrink-0 rounded-lg border border-border object-cover" />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong text-ink-faint">
                <ImageIcon size={20} />
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="font-medium text-ink">{product.nombre}</span>
                  <FieldVisibilityBadge field="nombre" visibleFields={visibleFields} />
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => onEdit(product)}
                    className="flex size-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
                    title="Editar"
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    className="flex size-8 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                    title="Eliminar"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[13.5px] text-ink">${formatPesos(product.precio)}</span>
                <FieldVisibilityBadge field="precio" visibleFields={visibleFields} />
              </div>

              {product.descripcion && (
                <div className="flex items-start gap-1.5">
                  <p className="line-clamp-2 whitespace-pre-line text-[13px] text-ink-muted">{product.descripcion}</p>
                  <FieldVisibilityBadge field="descripcion" visibleFields={visibleFields} />
                </div>
              )}

              <p className="text-[13px] text-ink-muted">{product.ofertas_summary}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
