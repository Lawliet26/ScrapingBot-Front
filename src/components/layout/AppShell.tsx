import { ChatCircleDots, Package, SignOut, Sparkle } from '@phosphor-icons/react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/conversaciones', label: 'Conversaciones', icon: ChatCircleDots },
  { to: '/agente', label: 'Prompt del agente', icon: Sparkle },
]

export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-[100dvh] bg-canvas">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <ChatCircleDots size={16} weight="fill" />
          </div>
          <span className="text-[15px] font-semibold text-ink">Dropi Bot</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {NAV_ITEMS.map(({ to, label, icon: ItemIcon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-muted transition-colors',
                  'hover:bg-canvas hover:text-ink',
                  isActive && 'bg-accent-soft text-accent-strong hover:bg-accent-soft hover:text-accent-strong',
                )
              }
            >
              <ItemIcon size={17} weight="regular" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-border px-4 py-3">
          <Avatar name={user?.username ?? '?'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{user?.username}</p>
            <p className="text-[11px] text-ink-faint">Staff</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-canvas hover:text-danger"
            title="Cerrar sesión"
          >
            <SignOut size={17} />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
