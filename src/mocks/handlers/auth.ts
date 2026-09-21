import type { MeResponse } from '@/api/auth'
import { field, noContent, ok, route } from '../router'

const SESSION: MeResponse = { user: { id: 1, username: 'staff.demo' }, is_staff: true }

let loggedIn = false

route('GET', '/auth/csrf/', () => noContent())

route('GET', '/auth/me/', () => (loggedIn ? ok(SESSION) : { status: 403, errors: [], detail: 'No autenticado.' }))

// Cualquier usuario/contraseña entra; el nombre que escribas se usa como sesión.
route('POST', '/auth/login/', ({ body }) => {
  loggedIn = true
  const username = field(body, 'username') || SESSION.user.username
  return ok({ ...SESSION, user: { ...SESSION.user, username } })
})

route('POST', '/auth/logout/', () => {
  loggedIn = false
  return noContent()
})
