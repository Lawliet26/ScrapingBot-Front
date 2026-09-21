import type { ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: Icon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: IconComponent, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 px-6 py-16 text-center', className)}>
      <div className="flex size-16 items-center justify-center rounded-full bg-canvas text-ink-faint neu-inset">
        <IconComponent size={26} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="max-w-xs text-[13px] text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
