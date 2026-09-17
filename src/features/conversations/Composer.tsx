import { Microphone, Paperclip, PaperPlaneTilt, Stop, Trash, WarningCircle } from '@phosphor-icons/react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Spinner } from '@/components/ui/spinner'
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
      <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3 text-[13px] text-ink-muted">
        <WarningCircle size={16} />
        Apagá el bot para responder.
      </div>
    )
  }

  if (recorder.state === 'recording') {
    return (
      <div className="flex items-center gap-3 border-t border-border bg-surface px-4 py-3">
        <span className="flex size-2 shrink-0 animate-pulse rounded-full bg-danger" />
        <span className="font-mono text-sm text-ink">{formatDurationMMSS(recorder.seconds)}</span>
        <span className="text-[13px] text-ink-faint">Grabando nota de voz... (máx 1:30)</span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={recorder.cancel}
            className="flex size-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
            title="Cancelar"
          >
            <Trash size={16} />
          </button>
          <button
            type="button"
            onClick={recorder.stop}
            className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-strong"
            title="Detener"
          >
            <Stop size={16} weight="fill" />
          </button>
        </div>
      </div>
    )
  }

  if (recorder.state === 'recorded' && recorder.blob) {
    return (
      <div className="flex items-center gap-3 border-t border-border bg-surface px-4 py-3">
        <span className="text-[13px] text-ink">Nota de voz lista · {formatDurationMMSS(recorder.seconds)}</span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={recorder.cancel}
            className="flex size-9 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
            title="Descartar"
          >
            <Trash size={16} />
          </button>
          <button
            type="button"
            onClick={handleSendVoice}
            disabled={isSending}
            className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-50"
            title="Enviar"
          >
            {isSending ? <Spinner className="size-4 text-accent-ink" /> : <PaperPlaneTilt size={16} weight="fill" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-border bg-surface px-4 py-3">
      {recorder.error && <p className="mb-2 text-[13px] text-danger">{recorder.error}</p>}
      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
          title="Adjuntar archivo"
        >
          <Paperclip size={18} />
        </button>
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
          className="max-h-32 flex-1 resize-none rounded-full border border-border-strong bg-canvas px-4 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />

        {text.trim() ? (
          <button
            type="button"
            onClick={handleSendText}
            disabled={isSending}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-50"
            title="Enviar"
          >
            {isSending ? <Spinner className="size-4 text-accent-ink" /> : <PaperPlaneTilt size={16} weight="fill" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void recorder.start()}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
            title="Grabar nota de voz"
          >
            <Microphone size={18} />
          </button>
        )}
      </div>
    </div>
  )
}
