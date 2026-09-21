import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Botones neumórficos: en reposo sobresalen del canvas, al presionar se hunden.
 * El foco usa outline (no ring) para no pisar las sombras que dan el relieve.
 */
const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium select-none',
    'transition-[box-shadow,filter,color,background-color] duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        primary:
          'bg-linear-to-br from-accent to-accent-strong text-accent-ink neu-accent hover:brightness-110 active:neu-accent-pressed active:brightness-95',
        secondary: 'bg-canvas text-ink neu-raised hover:text-accent-strong active:neu-pressed',
        ghost: 'text-ink-muted hover:text-ink hover:neu-raised-sm active:neu-pressed',
        danger: 'bg-danger text-white neu-raised hover:brightness-110 active:neu-accent-pressed',
        'danger-ghost': 'text-danger hover:neu-raised-sm active:neu-pressed',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] [&_svg]:size-4',
        md: 'h-10 px-4 [&_svg]:size-4',
        lg: 'h-12 px-5 text-base font-semibold [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-[18px]',
        'icon-sm': 'size-8 rounded-lg [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
