import { Sparkle } from '@phosphor-icons/react'
import type { ComponentProps } from 'react'
import type { ConversationNote } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { NotesList } from './NotesPanel'

interface NotesTriggerProps extends ComponentProps<typeof Button> {
  count: number
  active?: boolean
}

function NotesTrigger({ count, active, className, ...props }: NotesTriggerProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', active && 'text-accent-strong neu-inset-sm', className)}
      title="Notas IA"
      aria-label="Notas IA"
      {...props}
    >
      <Sparkle size={18} weight={active ? 'fill' : 'regular'} />
      {count > 0 && <span className="absolute right-2 top-2 flex size-2 rounded-full bg-accent" aria-hidden />}
    </Button>
  )
}

interface NotesDialogProps {
  notes: ConversationNote[]
  /** En pantallas grandes el mismo botón abre/cierra el panel lateral en vez del diálogo. */
  panelOpen: boolean
  onTogglePanel: () => void
}

export function NotesDialog({ notes, panelOpen, onTogglePanel }: NotesDialogProps) {
  const count = notes?.length ?? 0

  return (
    <>
      <NotesTrigger count={count} active={panelOpen} className="hidden xl:flex" onClick={onTogglePanel} aria-pressed={panelOpen} />

      <Dialog>
        <DialogTrigger asChild>
          <NotesTrigger count={count} className="xl:hidden" />
        </DialogTrigger>
        <DialogContent className="max-h-[70dvh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notas IA</DialogTitle>
          </DialogHeader>
          <NotesList notes={notes} />
        </DialogContent>
      </Dialog>
    </>
  )
}
