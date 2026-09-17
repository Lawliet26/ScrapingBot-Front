import { Sparkle } from '@phosphor-icons/react'
import type { ConversationNote } from '@/api/types'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateDDMMHHmm } from '@/lib/format'

export function NotesPanel({ notes }: { notes: ConversationNote[] }) {
  const sorted = [...(notes ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex h-14 items-center border-b border-border px-4">
        <h2 className="text-sm font-semibold text-ink">Notas IA</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {sorted.length === 0 ? (
          <EmptyState icon={Sparkle} title="Sin notas todavía" description="El agente todavía no dejó notas en esta conversación." />
        ) : (
          <div className="space-y-2">
            {sorted.map((note) => (
              <div key={note.id} className="rounded-lg border border-border bg-canvas p-3">
                <p className="mb-1 text-[11px] font-medium text-ink-faint">{formatDateDDMMHHmm(note.created_at)}</p>
                <p className="text-[13px] leading-relaxed text-ink">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
