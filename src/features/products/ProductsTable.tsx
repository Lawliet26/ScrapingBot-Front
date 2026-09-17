import { PencilSimple, Trash } from '@phosphor-icons/react'
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
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
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
                  <p className="whitespace-pre-line text-ink-muted">{product.descripcion || '—'}</p>
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
  )
}
