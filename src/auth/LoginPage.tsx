import { ChatCircleDots, Eye, EyeSlash, LockKey, User, WarningCircle } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { AppBackground } from '@/components/backgrounds/AppBackground'
import { Banner } from '@/components/ui/banner'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from './AuthProvider'
import { AUTH_BYPASS } from './bypass'

export function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/productos'

  // En bypass la sesión ya viene "autenticada": no redirigimos solos para poder
  // seguir viendo esta pantalla; el botón Ingresar lleva al panel.
  if (status === 'authenticated' && !AUTH_BYPASS) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(username, password)
      if (AUTH_BYPASS) navigate(redirectTo, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Usuario o contraseña incorrectos.')
      } else if (err instanceof ApiError) {
        setError(err.detail ?? err.nonFieldMessages[0] ?? err.message)
      } else {
        setError('No pudimos conectar con el servidor. Intentá de nuevo.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center px-4">
      <AppBackground />

      <div className="relative w-full max-w-[400px] animate-in">
        <div className="mb-8 flex flex-col items-center gap-5 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-canvas neu-raised">
            <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-accent to-accent-strong text-accent-ink neu-accent">
              <ChatCircleDots size={20} weight="fill" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Panel Dropi Bot</h1>
            <p className="text-sm text-ink-muted">Ingresá con tu cuenta de staff</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl bg-canvas p-8 neu-raised-lg">
          {error && (
            <Banner tone="danger">
              <WarningCircle size={16} />
              {error}
            </Banner>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <InputField
              icon={User}
              containerClassName="h-12"
              id="username"
              name="username"
              autoComplete="username"
              placeholder="tu.usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!error}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <InputField
              icon={LockKey}
              containerClassName="h-12"
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 flex size-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent/60"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              }
            />
          </div>

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="size-4 text-accent-ink" /> : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-[12px] text-ink-faint">Acceso exclusivo para el equipo de soporte</p>
      </div>
    </div>
  )
}
