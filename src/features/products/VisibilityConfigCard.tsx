import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AgentVisibleField } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useProductsConfigQuery, useUpdateProductsConfig } from './hooks'

const FIELDS: { key: AgentVisibleField; label: string }[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'precio', label: 'Precio' },
]

export function VisibilityConfigCard() {
  const configQuery = useProductsConfigQuery()
  const updateConfig = useUpdateProductsConfig()
  const [selected, setSelected] = useState<AgentVisibleField[]>([])

  useEffect(() => {
    if (configQuery.data) setSelected(configQuery.data.agent_visible_fields)
  }, [configQuery.data])

  function toggle(field: AgentVisibleField, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, field] : prev.filter((f) => f !== field)))
  }

  async function handleSave() {
    try {
      await updateConfig.mutateAsync({ agent_visible_fields: selected })
      toast.success('Visibilidad guardada.')
    } catch {
      toast.error('No pudimos guardar la visibilidad.')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">Campos visibles para el agente</h2>
      <p className="mt-0.5 text-[13px] text-ink-muted">
        El agente de IA solo puede mencionar los campos marcados aquí.
      </p>

      {configQuery.isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-32" />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-4">
          {FIELDS.map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-[13.5px] text-ink">
              <Checkbox checked={selected.includes(key)} onCheckedChange={(checked) => toggle(key, checked === true)} />
              {label}
            </label>
          ))}
        </div>
      )}

      <Button size="sm" className="mt-4" onClick={() => void handleSave()} disabled={updateConfig.isPending || configQuery.isLoading}>
        {updateConfig.isPending && <Spinner className="size-4 text-accent-ink" />}
        Guardar visibilidad
      </Button>
    </div>
  )
}
