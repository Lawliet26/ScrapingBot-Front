import { Eye } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { AgentVisibleField } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
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
    <Card className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-canvas text-accent neu-inset">
          <Eye size={20} />
        </div>
        <div>
          <CardTitle>Campos visibles para el agente</CardTitle>
          <CardDescription>El agente de IA solo puede mencionar los campos marcados aquí.</CardDescription>

          {configQuery.isLoading ? (
            <div className="mt-4 flex gap-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-20" />
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {FIELDS.map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2.5 text-[13.5px] text-ink">
                  <Checkbox checked={selected.includes(key)} onCheckedChange={(checked) => toggle(key, checked === true)} />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="shrink-0 self-start md:self-center"
        onClick={() => void handleSave()}
        disabled={updateConfig.isPending || configQuery.isLoading}
      >
        {updateConfig.isPending && <Spinner className="size-4" />}
        Guardar visibilidad
      </Button>
    </Card>
  )
}
