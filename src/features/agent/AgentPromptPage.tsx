import { Info, SlidersHorizontal, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import type { AgentProvider } from '@/api/types'
import { Banner } from '@/components/ui/banner'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FieldError, FieldHint, Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
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
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-5 w-80" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-[520px] w-full rounded-2xl" />
          <Skeleton className="h-[320px] w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (promptQuery.isError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
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

  const isDirty =
    !!promptQuery.data &&
    (systemPrompt !== promptQuery.data.system_prompt ||
      provider !== promptQuery.data.provider ||
      openaiModel !== promptQuery.data.openai_model ||
      debounceSeconds !== String(promptQuery.data.debounce_seconds))

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="Prompt del agente"
        description="Controlá cómo responde el bot en WhatsApp."
        actions={
          <Button type="submit" form="agent-prompt-form" disabled={updatePrompt.isPending || !isDirty}>
            {updatePrompt.isPending && <Spinner className="size-4 text-accent-ink" />}
            Guardar y activar
          </Button>
        }
      />

      {/* Dos columnas: el prompt es texto largo y quiere ancho; la configuración son tres campos chicos. */}
      <form id="agent-prompt-form" onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <Card padding="lg" className="flex min-h-[560px] flex-col">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <CardTitle>Prompt del sistema</CardTitle>
              <CardDescription>Instrucciones que el bot sigue en cada conversación.</CardDescription>
            </div>
            <span className="shrink-0 text-[12px] tabular-nums text-ink-faint">{systemPrompt.length.toLocaleString('es-CO')} caracteres</span>
          </div>
          <Textarea
            id="system_prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="flex-1 resize-none font-mono text-[13px] leading-relaxed"
            required
            aria-label="Prompt del sistema"
            aria-invalid={!!fieldErrors.system_prompt}
          />
          <FieldError message={fieldErrors.system_prompt} />
        </Card>

        <div className="space-y-6">
          <Card padding="lg">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-accent neu-inset">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <CardTitle>Configuración</CardTitle>
                <CardDescription>Aplica a todas las conversaciones.</CardDescription>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
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
                <div className="space-y-2 animate-in">
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

              <div className="space-y-2">
                <Label htmlFor="debounce_seconds">Debounce (segundos)</Label>
                <Input
                  id="debounce_seconds"
                  type="number"
                  min={1}
                  value={debounceSeconds}
                  onChange={(e) => setDebounceSeconds(e.target.value)}
                  aria-invalid={!!fieldErrors.debounce_seconds}
                />
                <FieldHint>Cuánto espera el bot a que el cliente termine de escribir antes de responder.</FieldHint>
                <FieldError message={fieldErrors.debounce_seconds} />
              </div>
            </div>
          </Card>

          <Banner tone="info">
            <Info size={16} />
            Los cambios se aplican de inmediato al guardar.
          </Banner>
        </div>
      </form>
    </div>
  )
}
