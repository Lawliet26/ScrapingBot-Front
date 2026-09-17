import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('text-[13px] font-medium text-ink-muted', className)}
      {...props}
    />
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[13px] text-danger">{message}</p>
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-ink-faint">{children}</p>
}
