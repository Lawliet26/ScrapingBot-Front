import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* Grabado en el canvas; el tono lo da el texto, no el fondo. */
const TONES = {
  warning: 'text-warning',
  info: 'text-accent-strong',
  danger: 'text-danger',
} as const

export function Banner({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-center gap-2.5 rounded-xl bg-canvas px-4 py-2.5 text-[13px] font-medium neu-inset [&_svg]:shrink-0',
        TONES[tone],
      )}
    >
      {children}
    </div>
  )
}
