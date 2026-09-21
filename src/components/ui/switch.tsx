import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

/** Pista hundida, perilla en relieve. Encendido: la perilla toma el color de éxito. */
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'group relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-canvas neu-inset-sm transition-colors',
        'data-[state=checked]:bg-success-soft',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-5 translate-x-1 rounded-full bg-surface-raised neu-raised-sm',
          'transition-[transform,background-color] duration-200 ease-out',
          'data-[state=checked]:translate-x-6 data-[state=checked]:bg-success',
        )}
      />
    </SwitchPrimitive.Root>
  )
}
