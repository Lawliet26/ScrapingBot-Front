import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/** Sin marcar es un hueco en el canvas; al marcar sale en relieve con el color de acento. */
export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-md bg-canvas neu-inset-sm',
        'transition-[box-shadow,background-color] duration-150',
        'data-[state=checked]:bg-accent data-[state=checked]:neu-raised-sm',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-accent-ink">
        <Check size={13} weight="bold" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
