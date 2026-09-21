import { Microphone, Paperclip, PaperPlaneTilt, Stop, Trash, WarningCircle } from '@phosphor-icons/react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { formatDurationMMSS } from '@/lib/format'
import { useVoiceRecorder } from './useVoiceRecorder'

const MAX_TEXT_LENGTH = 4096

interface ComposerProps {
  disabled: boolean
  isSending: boolean
  onSendText: (text: string) => void
  onSendFile: (file: File) => void
  onSendVoice: (blob: Blob, durationSeconds: number) => void
}

const SHELL = 'shrink-0 border-t border-border/60 bg-canvas px-4 py-4 lg:px-6'

export function Composer({ disabled, isSending, onSendText, onSendFile, onSendVoice }: ComposerProps) {
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recorder = useVoiceRecorder()

  function handleSendText() {
    const trimmed = text.trim()
    if (!trimmed) return
    onSendText(trimmed)
    setText('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendText()
    }
  }

  function handleFileChange(files: FileList | null) {
    const file = files?.[0]
    if (file) onSendFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSendVoice() {
    if (recorder.blob) {
      onSendVoice(recorder.blob, recorder.seconds)
      recorder.reset()
    }
  }

  if (disabled) {
    return (
      <div className={SHELL}>
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 rounded-2xl bg-canvas px-4 py-3 text-[13px] text-ink-muted neu-inset">
          <WarningCircle size={16} className="shrink-0" />
          Apagá el bot para responder.
        </div>
      </div>
    )
  }

  if (recorder.state === 'recording') {
    return (
      <div className={SHELL}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-canvas py-2 pl-5 pr-2 neu-inset">
          <span className="flex size-2.5 shrink-0 animate-pulse rounded-full bg-danger shadow-[0_0_10px_var(--danger)]" />
          <span className="font-mono text-sm text-ink">{formatDurationMMSS(recorder.seconds)}</span>
          <span className="truncate text-[13px] text-ink-faint">Grabando nota de voz... (máx 1:30)</span>
          <div className="ml-auto flex gap-2">
            <Button variant="danger-ghost" size="icon" className="rounded-full" onClick={recorder.cancel} title="Cancelar">
              <Trash size={16} />
            </Button>
            <Button size="icon" className="rounded-full" onClick={recorder.stop} title="Detener">
              <Stop size={16} weight="fill" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (recorder.state === 'recorded' && recorder.blob) {
    return (
      <div className={SHELL}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl bg-canvas py-2 pl-5 pr-2 neu-inset">
          <Microphone size={16} className="shrink-0 text-accent" weight="fill" />
          <span className="text-[13px] text-ink">Nota de voz lista · {formatDurationMMSS(recorder.seconds)}</span>
          <div className="ml-auto flex gap-2">
            <Button variant="danger-ghost" size="icon" className="rounded-full" onClick={recorder.cancel} title="Descartar">
              <Trash size={16} />
            </Button>
            <Button size="icon" className="rounded-full" onClick={handleSendVoice} disabled={isSending} title="Enviar">
              {isSending ? <Spinner className="size-4 text-accent-ink" /> : <PaperPlaneTilt size={16} weight="fill" />}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const hasText = text.trim().length > 0

  return (
    <div className={SHELL}>
      <div className="mx-auto max-w-3xl">
        {recorder.error && <p className="mb-2 text-[13px] text-danger">{recorder.error}</p>}
        <div className="flex items-end gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar archivo"
            aria-label="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files)}
          />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
            onKeyDown={handleKeyDown}
            placeholder="Escribí un mensaje..."
            rows={1}
            aria-label="Mensaje"
            className={cn(
              'max-h-32 min-h-10 flex-1 resize-none rounded-3xl bg-canvas px-5 py-2.5 text-sm leading-5 text-ink neu-inset placeholder:text-ink-faint',
              'transition-[outline-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
            )}
          />

          {hasText ? (
            <Button size="icon" className="rounded-full" onClick={handleSendText} disabled={isSending} title="Enviar" aria-label="Enviar">
              {isSending ? <Spinner className="size-4 text-accent-ink" /> : <PaperPlaneTilt size={16} weight="fill" />}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => void recorder.start()}
              title="Grabar nota de voz"
              aria-label="Grabar nota de voz"
            >
              <Microphone size={18} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
