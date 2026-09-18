import { ChatCircleDots, Monitor, Moon, Package, SignOut, Sparkle, Sun } from '@phosphor-icons/react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Avatar } from '@/components/ui/avatar'
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/conversaciones', label: 'Conversaciones', icon: ChatCircleDots },
  { to: '/agente', label: 'Prompt del agente', icon: Sparkle },
]

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Claro', icon: Sun },
  { mode: 'standard', label: 'Estándar', icon: Monitor },
  { mode: 'dark', label: 'Oscuro', icon: Moon },
]

const ROW_HEIGHT = 40
const ROW_GAP = 4

const EASE = 'duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)]'

function revealClass(expanded: boolean) {
  return cn(
    'overflow-hidden whitespace-nowrap transition-[max-width,opacity]',
    EASE,
    'group-has-[:focus-visible]/sidebar:max-w-[160px] group-has-[:focus-visible]/sidebar:opacity-100',
    expanded ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0',
  )
}

function nextThemeMode(current: ThemeMode): ThemeMode {
  const index = THEME_OPTIONS.findIndex((option) => option.mode === current)
  return THEME_OPTIONS[(index + 1) % THEME_OPTIONS.length].mode
}

export function AppShell() {
  const { user, logout } = useAuth()
  const { mode, setMode } = useTheme()
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)

  const activeIndex = NAV_ITEMS.findIndex((item) => location.pathname.startsWith(item.to))
  const CurrentThemeIcon = THEME_OPTIONS.find((option) => option.mode === mode)?.icon ?? Monitor

  return (
    <div className="min-h-[100dvh] bg-canvas lg:flex">
      {/* Barra superior mobile */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <ChatCircleDots size={16} weight="fill" />
          </div>
          <span className="text-[15px] font-semibold text-ink">Dropi Bot</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode(nextThemeMode(mode))}
            className="flex size-9 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-ink"
            title="Cambiar tema"
          >
            <CurrentThemeIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex size-9 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-danger"
            title="Cerrar sesión"
          >
            <SignOut size={18} />
          </button>
        </div>
      </div>

      {/* Barra inferior mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-surface lg:hidden">
        {NAV_ITEMS.map(({ to, label, icon: ItemIcon }, index) => (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium',
              index === activeIndex ? 'text-accent-strong' : 'text-ink-faint',
            )}
          >
            <ItemIcon size={20} weight={index === activeIndex ? 'fill' : 'regular'} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar desktop: rail que se expande al pasar el mouse */}
      <div className="group/sidebar relative hidden w-16 shrink-0 lg:block">
        <aside
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          className={cn(
            'absolute inset-y-0 left-0 z-20 flex flex-col overflow-hidden border-r border-border bg-surface',
            'transition-[width,box-shadow]',
            EASE,
            'group-has-[:focus-visible]/sidebar:w-60 group-has-[:focus-visible]/sidebar:shadow-[8px_0_24px_-8px_rgba(0,0,0,0.35)]',
            expanded ? 'w-60 shadow-[8px_0_24px_-8px_rgba(0,0,0,0.35)]' : 'w-16 shadow-[8px_0_24px_-8px_rgba(0,0,0,0)]',
          )}
        >
          <div className="flex h-14 items-center gap-2 px-4">
            <div
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink transition-transform',
                EASE,
                'motion-reduce:transition-none',
                expanded && 'rotate-[12deg]',
              )}
            >
              <ChatCircleDots size={16} weight="fill" />
            </div>
            <span className={cn(revealClass(expanded), 'text-[15px] font-semibold text-ink')}>Dropi Bot</span>
          </div>

          <nav className="relative flex flex-1 flex-col gap-1 px-3 py-2">
            <div
              aria-hidden
              className={cn('absolute inset-x-3 top-2 h-10 rounded-lg bg-accent-soft transition-[transform,opacity]', EASE)}
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
                  onClick={() => setExpanded(false)}
                  className={cn(
                    'relative z-10 flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                    isActive ? 'text-accent-strong' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <ItemIcon size={17} weight="regular" className="shrink-0" />
                  <span className={revealClass(expanded)}>{label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className={cn(revealClass(expanded), 'mx-3 mb-1 flex items-center gap-1 rounded-lg bg-canvas p-1')}>
            {THEME_OPTIONS.map(({ mode: optionMode, label, icon: OptionIcon }) => (
              <button
                key={optionMode}
                type="button"
                onClick={() => setMode(optionMode)}
                title={label}
                aria-pressed={mode === optionMode}
                className={cn(
                  'flex h-7 flex-1 items-center justify-center rounded-md transition-colors',
                  mode === optionMode ? 'bg-surface text-accent-strong shadow-sm' : 'text-ink-faint hover:text-ink',
                )}
              >
                <OptionIcon size={14} weight={mode === optionMode ? 'fill' : 'regular'} />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 border-t border-border px-4 py-3">
            <Avatar name={user?.username ?? '?'} />
            <div className={cn(revealClass(expanded), 'min-w-0 flex-1')}>
              <p className="truncate text-[13px] font-medium text-ink">{user?.username}</p>
              <p className="text-[11px] text-ink-faint">Staff</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className={cn(
                revealClass(expanded),
                'flex h-8 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-canvas hover:text-danger',
                expanded ? 'w-8' : 'w-0',
                'group-has-[:focus-visible]/sidebar:w-8',
              )}
              title="Cerrar sesión"
            >
              <SignOut size={17} className="shrink-0" />
            </button>
          </div>
        </aside>
      </div>

      <main className="h-[100dvh] min-w-0 overflow-y-auto pt-14 pb-16 lg:flex-1 lg:pt-0 lg:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
