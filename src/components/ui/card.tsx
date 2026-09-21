import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Superficie neumórfica. `raised` sobresale del canvas (contenedores, paneles);
 * `inset` se hunde (zonas de lectura, listas dentro de un panel).
 */
const cardVariants = cva('rounded-2xl bg-canvas', {
  variants: {
    variant: {
      raised: 'neu-raised',
      'raised-lg': 'neu-raised-lg',
      inset: 'neu-inset',
    },
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-7',
    },
  },
  defaultVariants: {
    variant: 'raised',
    padding: 'md',
  },
})

interface CardProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, padding, className }))} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold text-ink', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-[13px] text-ink-muted', className)} {...props} />
}
