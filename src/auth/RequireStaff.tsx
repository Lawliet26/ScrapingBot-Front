import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullPageSpinner } from '@/components/ui/spinner'
import { useAuth } from './AuthProvider'

export function RequireStaff() {
  const { status, isStaff } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner />

  if (status === 'anonymous' || !isStaff) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
