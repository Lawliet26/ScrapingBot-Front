import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', {
  variants: {
    tone: {
      accent: 'bg-accent-soft text-accent-strong',
      neutral: 'bg-canvas text-ink-muted border border-border-strong',
      success: 'bg-success-soft text-success',
      danger: 'bg-danger-soft text-danger',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
})

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />
}

/** Badge de estado de conversación: label + color exactos, resueltos por el backend. */
export function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {label}
    </span>
  )
}

/** Contador circular (mensajes / notas sin ver), color exacto pasado por prop. */
export function CounterBadge({ count, color, label }: { count: number; color: string; label: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-label={label}
      className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
      style={{ backgroundColor: color }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
