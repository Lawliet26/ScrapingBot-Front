import { Sparkle, X } from '@phosphor-icons/react'
import type { ConversationNote } from '@/api/types'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateDDMMHHmm } from '@/lib/format'

export function NotesList({ notes }: { notes: ConversationNote[] }) {
  const sorted = [...(notes ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  if (sorted.length === 0) {
    return <EmptyState icon={Sparkle} title="Sin notas todavía" description="El agente todavía no dejó notas en esta conversación." />
  }

  return (
    <div className="space-y-3">
      {sorted.map((note) => (
        <div key={note.id} className="rounded-xl bg-canvas p-3.5 neu-raised-sm">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-ink-faint">
            <Sparkle size={12} weight="fill" className="text-accent" />
            {formatDateDDMMHHmm(note.created_at)}
          </p>
          <p className="text-[13px] leading-relaxed text-ink">{note.content}</p>
        </div>
      ))}
    </div>
  )
}

interface NotesPanelProps {
  notes: ConversationNote[]
  open: boolean
  onClose: () => void
}

export function NotesPanel({ notes, open, onClose }: NotesPanelProps) {
  if (!open) return null

  return (
    <div className="hidden h-full w-[280px] shrink-0 flex-col border-l border-border/60 bg-canvas animate-in xl:flex">
      <div className="flex h-[72px] items-center gap-2.5 pl-5 pr-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-canvas text-accent neu-inset-sm">
          <Sparkle size={15} weight="fill" />
        </div>
        <h2 className="text-sm font-semibold text-ink">Notas IA</h2>
        {notes.length > 0 && <span className="text-[12px] text-ink-faint">{notes.length}</span>}
        <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onClose} aria-label="Cerrar notas">
          <X size={16} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <NotesList notes={notes} />
      </div>
    </div>
  )
}
