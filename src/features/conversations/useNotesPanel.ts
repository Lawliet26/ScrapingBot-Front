import { useState } from 'react'

const NOTES_PANEL_KEY = 'notes-panel-open'

function readStoredOpen(): boolean | null {
  try {
    const stored = localStorage.getItem(NOTES_PANEL_KEY)
    return stored === null ? null : stored === 'true'
  } catch {
    return null
  }
}

/**
 * Estado del panel lateral de notas. Sin preferencia guardada, se abre solo
 * cuando la conversación tiene notas: un panel vacío de 300px roba espacio al chat.
 */
export function useNotesPanel(notesCount: number) {
  const [preference, setPreference] = useState<boolean | null>(readStoredOpen)
  const open = preference ?? notesCount > 0

  function setOpen(next: boolean) {
    setPreference(next)
    try {
      localStorage.setItem(NOTES_PANEL_KEY, String(next))
    } catch {
      // no es crítico si no se puede persistir
    }
  }

  return { open, setOpen, toggle: () => setOpen(!open) }
}
