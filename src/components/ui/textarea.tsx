import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex w-full rounded-xl bg-canvas px-4 py-3 text-sm leading-relaxed text-ink neu-inset placeholder:text-ink-faint',
        'transition-[outline-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-danger/60',
        className,
      )}
      {...props}
    />
  )
}
