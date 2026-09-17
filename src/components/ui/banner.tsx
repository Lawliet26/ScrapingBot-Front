import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TONES = {
  warning: 'bg-[#fdf3e1] text-[#8a5a12] border-[#f0d8a8]',
  info: 'bg-accent-soft text-accent-strong border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
} as const

export function Banner({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium', TONES[tone])}>
      {children}
    </div>
  )
}
