import { cn } from '@/lib/utils'

const PALETTE = ['#2A5EE8', '#0F9D8B', '#B8571C', '#6A4CD4', '#C43D6B', '#1E8F5F']

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white', className)}
      style={{ backgroundColor: colorForName(name) }}
    >
      {initialsForName(name)}
    </div>
  )
}
