import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { fetchCsrf, fetchMe, login as loginRequest, logout as logoutRequest, type MeResponse } from '@/api/auth'
import type { User } from '@/api/types'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  isStaff: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    fetchCsrf().catch(() => {
      // Sin conexión al backend todavía; el login mostrará el error real al intentar.
    })
  }, [])

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    retry: false,
    staleTime: Infinity,
  })

  const value = useMemo<AuthContextValue>(() => {
    const status: AuthStatus = meQuery.isLoading ? 'loading' : meQuery.data ? 'authenticated' : 'anonymous'

    return {
      status,
      user: meQuery.data?.user ?? null,
      isStaff: meQuery.data?.is_staff ?? false,
      login: async (username: string, password: string) => {
        await fetchCsrf()
        const result = await loginRequest(username, password)
        queryClient.setQueryData<MeResponse>(['auth', 'me'], result)
      },
      logout: async () => {
        await logoutRequest()
        queryClient.setQueryData(['auth', 'me'], null)
        queryClient.clear()
      },
    }
  }, [meQuery.isLoading, meQuery.data, queryClient])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
