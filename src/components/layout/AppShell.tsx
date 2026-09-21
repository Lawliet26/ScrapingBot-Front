import { ChatCircleDots, Moon, Package, PushPin, PushPinSlash, SignOut, Sparkle, Sun } from '@phosphor-icons/react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { AppBackground } from '@/components/backgrounds/AppBackground'
import { Avatar } from '@/components/ui/avatar'
import { useConversationsQuery } from '@/features/conversations/hooks'
import { useConversationListSync } from '@/features/conversations/useConversationListSync'
import { useTheme } from '@/theme/ThemeProvider'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/conversaciones', label: 'Conversaciones', icon: ChatCircleDots },
  { to: '/agente', label: 'Prompt del agente', icon: Sparkle },
]

const ROW_HEIGHT = 44
const ROW_GAP = 6

const RAIL_WIDTH = 'w-[72px]'
const EXPANDED_WIDTH = 'w-[232px]'

const SIDEBAR_PINNED_KEY = 'sidebar-pinned'

const EASE = 'duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]'

function readStoredPinned(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_PINNED_KEY) === 'true'
  } catch {
    return false
  }
}

function revealClass(expanded: boolean) {
  return cn(
    'overflow-hidden whitespace-nowrap transition-[max-width,opacity]',
    EASE,
    'group-has-[:focus-visible]/sidebar:max-w-[160px] group-has-[:focus-visible]/sidebar:opacity-100',
    expanded ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0',
  )
}

function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl bg-canvas neu-raised-sm', className)}>
      <div className="flex size-6 items-center justify-center rounded-lg bg-linear-to-br from-accent to-accent-strong text-accent-ink">
        <ChatCircleDots size={14} weight="fill" />
      </div>
    </div>
  )
}

const ICON_BUTTON = cn(
  'flex size-9 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-[box-shadow,color]',
  'hover:text-ink hover:neu-raised-sm active:neu-pressed',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
)

/** Contador de no leídos: píldora cuando hay lugar, punto cuando el rail está enrollado. */
function UnreadBadge({ count, expanded }: { count: number; expanded: boolean }) {
  if (count <= 0) return null
  return (
    <>
      <span
        className={cn(
          revealClass(expanded),
          'ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold leading-none text-accent-ink',
        )}
      >
        {count > 99 ? '99+' : count}
      </span>
      <span
        aria-hidden
        className={cn('absolute right-3 top-2.5 size-2 rounded-full bg-accent transition-opacity', EASE, expanded ? 'opacity-0' : 'opacity-100')}
      />
    </>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useTheme()
  const location = useLocation()
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinnedState] = useState(readStoredPinned)

  useConversationListSync()

  // Comparte la query de la página de conversaciones (misma key): no genera un fetch extra.
  const conversationsQuery = useConversationsQuery('')
  const unreadCount = conversationsQuery.data?.results.reduce((acc, c) => acc + c.unseen_messages_count, 0) ?? 0

  // Fijado: ocupa su ancho real y empuja el contenido. Suelto: se despliega
  // sobre el contenido al pasar el mouse y se enrolla al salir.
  const expanded = pinned || hovered

  function setPinned(next: boolean) {
    setPinnedState(next)
    try {
      localStorage.setItem(SIDEBAR_PINNED_KEY, String(next))
    } catch {
      // no es crítico si no se puede persistir
    }
  }

  const activeIndex = NAV_ITEMS.findIndex((item) => location.pathname.startsWith(item.to))
  const ThemeIcon = mode === 'dark' ? Sun : Moon
  const themeLabel = mode === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'

  return (
    <div className="min-h-[100dvh] lg:flex">
      <AppBackground />

      {/* Barra superior mobile */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between bg-canvas px-4 neu-raised lg:hidden">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Dropi Bot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={toggleMode} className={ICON_BUTTON} title={themeLabel}>
            <ThemeIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className={cn(ICON_BUTTON, 'hover:text-danger')}
            title="Cerrar sesión"
          >
            <SignOut size={18} />
          </button>
        </div>
      </div>

      {/* Barra inferior mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch bg-canvas px-2 neu-raised lg:hidden">
        {NAV_ITEMS.map(({ to, label, icon: ItemIcon }, index) => {
          const isActive = index === activeIndex
          const showDot = to === '/conversaciones' && unreadCount > 0
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                isActive ? 'text-accent-strong' : 'text-ink-faint',
              )}
            >
              <span
                className={cn(
                  'relative flex h-8 w-12 items-center justify-center rounded-xl transition-[box-shadow]',
                  isActive && 'bg-canvas neu-inset-sm',
                )}
              >
                <ItemIcon size={20} weight={isActive ? 'fill' : 'regular'} />
                {showDot && <span aria-hidden className="absolute right-2.5 top-1 size-2 rounded-full bg-accent" />}
              </span>
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* Sidebar desktop: rail que se expande al pasar el mouse o queda fijo con el pin */}
      <div
        className={cn('group/sidebar relative hidden shrink-0 transition-[width] lg:block', EASE, pinned ? EXPANDED_WIDTH : RAIL_WIDTH)}
      >
        <aside
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={cn(
            'absolute inset-y-0 left-0 z-20 flex flex-col overflow-hidden bg-canvas neu-raised-lg',
            'transition-[width]',
            EASE,
            'group-has-[:focus-visible]/sidebar:w-[232px]',
            expanded ? EXPANDED_WIDTH : RAIL_WIDTH,
          )}
        >
          <div className="flex h-[72px] items-center gap-3 px-4">
            <BrandMark className={cn('size-10 transition-transform', EASE, 'motion-reduce:transition-none', expanded && 'rotate-[8deg]')} />
            <span className={cn(revealClass(expanded), 'flex-1 text-[15px] font-semibold tracking-tight text-ink')}>Dropi Bot</span>
            <button
              type="button"
              onClick={() => setPinned(!pinned)}
              aria-pressed={pinned}
              title={pinned ? 'Enrollar menú' : 'Mantener desplegado'}
              className={cn(
                revealClass(expanded),
                'flex h-8 shrink-0 items-center justify-center rounded-lg transition-[box-shadow,color]',
                'focus-visible:outline-2 focus-visible:outline-accent/60',
                expanded ? 'w-8' : 'w-0',
                'group-has-[:focus-visible]/sidebar:w-8',
                pinned ? 'text-accent-strong neu-inset-sm' : 'text-ink-faint hover:text-ink hover:neu-raised-sm',
              )}
            >
              {pinned ? <PushPinSlash size={16} /> : <PushPin size={16} />}
            </button>
          </div>

          <nav className="relative flex flex-1 flex-col gap-1.5 px-3.5 py-2">
            {/* Indicador activo: un hueco en el canvas que se desliza entre ítems */}
            <div
              aria-hidden
              className={cn('absolute inset-x-3.5 top-2 h-11 rounded-xl bg-canvas neu-inset transition-[transform,opacity]', EASE)}
              style={{
                transform: `translateY(${activeIndex >= 0 ? activeIndex * (ROW_HEIGHT + ROW_GAP) : 0}px)`,
                opacity: activeIndex >= 0 ? 1 : 0,
              }}
            />
            {NAV_ITEMS.map(({ to, label, icon: ItemIcon }, index) => {
              const isActive = index === activeIndex
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setHovered(false)}
                  className={cn(
                    'relative z-10 flex h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60',
                    isActive ? 'text-accent-strong' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <ItemIcon size={20} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                  <span className={revealClass(expanded)}>{label}</span>
                  {to === '/conversaciones' && <UnreadBadge count={unreadCount} expanded={expanded} />}
                </NavLink>
              )
            })}
          </nav>

          {/* Footer compacto: usuario + tema + salir en una sola fila */}
          <div className="flex items-center gap-2 px-4 py-4">
            <Avatar name={user?.username ?? '?'} className="size-10" />
            <div className={cn(revealClass(expanded), 'min-w-0 flex-1')}>
              <p className="truncate text-[13px] font-medium text-ink">{user?.username}</p>
              <p className="text-[11px] text-ink-faint">Staff</p>
            </div>
            <div className={cn(revealClass(expanded), 'flex shrink-0 items-center gap-1')}>
              <button type="button" onClick={toggleMode} className={cn(ICON_BUTTON, 'size-8 rounded-lg')} title={themeLabel}>
                <ThemeIcon size={16} />
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className={cn(ICON_BUTTON, 'size-8 rounded-lg hover:text-danger')}
                title="Cerrar sesión"
              >
                <SignOut size={16} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <main className="h-[100dvh] min-w-0 overflow-y-auto pt-14 pb-16 lg:flex-1 lg:pt-0 lg:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
