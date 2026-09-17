import { CircleNotch } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <CircleNotch className={cn('animate-spin text-ink-faint', className)} size={18} />
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
      <Spinner className="size-6" />
    </div>
  )
}
