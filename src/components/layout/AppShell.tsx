import { ChatCircleDots, Package, SignOut, Sparkle } from '@phosphor-icons/react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/conversaciones', label: 'Conversaciones', icon: ChatCircleDots },
  { to: '/agente', label: 'Prompt del agente', icon: Sparkle },
]

const ROW_HEIGHT = 40
const ROW_GAP = 4

const REVEAL = cn(
  'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-200',
  'group-hover/sidebar:max-w-[160px] group-hover/sidebar:opacity-100',
  'group-focus-within/sidebar:max-w-[160px] group-focus-within/sidebar:opacity-100',
  'motion-reduce:transition-none',
)

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const activeIndex = NAV_ITEMS.findIndex((item) => location.pathname.startsWith(item.to))

  return (
    <div className="flex min-h-[100dvh] bg-canvas">
      <div className="group/sidebar relative w-16 shrink-0">
        <aside
          className={cn(
            'absolute inset-y-0 left-0 z-20 flex w-16 flex-col overflow-hidden border-r border-border bg-surface',
            'transition-[width,box-shadow] duration-200 ease-out motion-reduce:transition-none',
            'group-hover/sidebar:w-60 group-hover/sidebar:shadow-xl',
            'group-focus-within/sidebar:w-60 group-focus-within/sidebar:shadow-xl',
          )}
        >
          <div className="flex h-14 items-center gap-2 px-4">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink transition-transform duration-300 group-hover/sidebar:rotate-[12deg] motion-reduce:transition-none">
              <ChatCircleDots size={16} weight="fill" />
            </div>
            <span className={cn(REVEAL, 'text-[15px] font-semibold text-ink')}>Dropi Bot</span>
          </div>

          <nav className="relative flex flex-1 flex-col gap-1 px-3 py-2">
            <div
              aria-hidden
              className="absolute inset-x-3 top-2 h-10 rounded-lg bg-accent-soft transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none"
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
                  className={cn(
                    'relative z-10 flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
                    isActive ? 'text-accent-strong' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <ItemIcon size={17} weight="regular" className="shrink-0" />
                  <span className={REVEAL}>{label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="flex items-center gap-2.5 border-t border-border px-4 py-3">
            <Avatar name={user?.username ?? '?'} />
            <div className={cn(REVEAL, 'min-w-0 flex-1')}>
              <p className="truncate text-[13px] font-medium text-ink">{user?.username}</p>
              <p className="text-[11px] text-ink-faint">Staff</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className={cn(
                REVEAL,
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-canvas hover:text-danger',
                'group-hover/sidebar:max-w-[32px] group-focus-within/sidebar:max-w-[32px]',
              )}
              title="Cerrar sesión"
            >
              <SignOut size={17} />
            </button>
          </div>
        </aside>
      </div>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
