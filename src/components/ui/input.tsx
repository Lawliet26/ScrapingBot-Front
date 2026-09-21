import type { Icon } from '@phosphor-icons/react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Campo hundido en el canvas: la sombra interior reemplaza al borde. */
const inputClassName = cn(
  'flex h-11 w-full rounded-xl bg-canvas px-4 text-sm text-ink neu-inset placeholder:text-ink-faint',
  'transition-[outline-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-danger/60',
)

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClassName, className)} {...props} />
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: Icon
  /** Control opcional a la derecha (ej: botón de mostrar contraseña). Se posiciona absoluto. */
  trailing?: ReactNode
  containerClassName?: string
}

/** Input con ícono al frente y slot opcional al final. Comparte el relieve con Input. */
export function InputField({ icon: LeadingIcon, trailing, className, containerClassName, ...props }: InputFieldProps) {
  return (
    <div
      className={cn(
        'relative flex h-11 items-center rounded-xl bg-canvas neu-inset transition-[outline-color]',
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent/60',
        'has-[[aria-invalid=true]]:outline-2 has-[[aria-invalid=true]]:outline-offset-2 has-[[aria-invalid=true]]:outline-danger/60',
        containerClassName,
      )}
    >
      <LeadingIcon size={18} className="pointer-events-none absolute left-4 text-ink-faint" />
      <input
        className={cn(
          'h-full w-full bg-transparent pl-11 text-sm text-ink placeholder:text-ink-faint focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          trailing ? 'pr-12' : 'pr-4',
          className,
        )}
        {...props}
      />
      {trailing}
    </div>
  )
}
