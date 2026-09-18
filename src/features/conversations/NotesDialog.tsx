import { Sparkle } from '@phosphor-icons/react'
import type { ConversationNote } from '@/api/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { NotesList } from './NotesPanel'

export function NotesDialog({ notes }: { notes: ConversationNote[] }) {
  const count = notes?.length ?? 0

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink xl:hidden"
          title="Notas IA"
        >
          <Sparkle size={18} />
          {count > 0 && (
            <span className="absolute right-1 top-1 flex size-2 rounded-full bg-accent" aria-hidden />
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[70dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notas IA</DialogTitle>
        </DialogHeader>
        <NotesList notes={notes} />
      </DialogContent>
    </Dialog>
  )
}
