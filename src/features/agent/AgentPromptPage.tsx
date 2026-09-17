import { Info, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import type { AgentProvider } from '@/api/types'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FieldError, Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useAgentPromptQuery, useUpdateAgentPrompt } from './hooks'

const PROVIDER_LABELS: Record<AgentProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI (ChatGPT)',
}

export function AgentPromptPage() {
  const promptQuery = useAgentPromptQuery()
  const updatePrompt = useUpdateAgentPrompt()

  const [systemPrompt, setSystemPrompt] = useState('')
  const [provider, setProvider] = useState<AgentProvider>('gemini')
  const [openaiModel, setOpenaiModel] = useState('')
  const [debounceSeconds, setDebounceSeconds] = useState('30')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!promptQuery.data) return
    setSystemPrompt(promptQuery.data.system_prompt)
    setProvider(promptQuery.data.provider)
    setOpenaiModel(promptQuery.data.openai_model)
    setDebounceSeconds(String(promptQuery.data.debounce_seconds))
  }, [promptQuery.data])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFieldErrors({})
    try {
      await updatePrompt.mutateAsync({
        system_prompt: systemPrompt,
        provider,
        openai_model: provider === 'openai' ? openaiModel : '',
        debounce_seconds: Number.parseInt(debounceSeconds, 10),
      })
      toast.success('Prompt guardado. Los cambios ya están activos.')
    } catch (err) {
      if (err instanceof ApiError) {
        const next: Record<string, string> = {}
        for (const fieldError of err.errors) {
          if (fieldError.field) next[fieldError.field] = fieldError.message
        }
        setFieldErrors(next)
        if (Object.keys(next).length === 0) toast.error(err.message)
      } else {
        toast.error('No pudimos guardar el prompt.')
      }
    }
  }

  if (promptQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-8">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (promptQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <EmptyState
          icon={WarningCircle}
          title="No pudimos cargar el prompt del agente"
          action={
            <Button variant="secondary" size="sm" onClick={() => void promptQuery.refetch()}>
              Reintentar
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-xl font-semibold text-ink">Prompt del agente</h1>
      <p className="text-sm text-ink-muted">Controlá cómo responde el bot en WhatsApp.</p>

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-[13px] text-accent-strong">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>Los cambios se aplican de inmediato; el proveedor y el debounce son globales.</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="system_prompt">Prompt del sistema</Label>
          <Textarea
            id="system_prompt"
            rows={14}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="font-mono text-[13px]"
            required
            aria-invalid={!!fieldErrors.system_prompt}
          />
          <FieldError message={fieldErrors.system_prompt} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Proveedor de IA</Label>
            <Select
              value={provider}
              onValueChange={(v) => {
                // Radix dispara un onValueChange("") espurio en el montaje (su <select>
                // nativo oculto para autofill); un valor real siempre es 'gemini' u 'openai'.
                if (v) setProvider(v as AgentProvider)
              }}
            >
              <SelectTrigger>
                <SelectValue>{PROVIDER_LABELS[provider]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === 'openai' && (
            <div className="space-y-1.5">
              <Label htmlFor="openai_model">Modelo (opcional)</Label>
              <Input
                id="openai_model"
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                placeholder="gpt-4-turbo"
                aria-invalid={!!fieldErrors.openai_model}
              />
              <FieldError message={fieldErrors.openai_model} />
            </div>
          )}
        </div>

        <div className="max-w-[200px] space-y-1.5">
          <Label htmlFor="debounce_seconds">Debounce (segundos)</Label>
          <Input
            id="debounce_seconds"
            type="number"
            min={1}
            value={debounceSeconds}
            onChange={(e) => setDebounceSeconds(e.target.value)}
            aria-invalid={!!fieldErrors.debounce_seconds}
          />
          <FieldError message={fieldErrors.debounce_seconds} />
        </div>

        <Button type="submit" disabled={updatePrompt.isPending}>
          {updatePrompt.isPending && <Spinner className="size-4 text-accent-ink" />}
          Guardar y activar
        </Button>
      </form>
    </div>
  )
}
