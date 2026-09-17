import { api, ensureCsrfCookie } from './client'
import type { User } from './types'

export interface MeResponse {
  user: User
  is_staff: boolean
}

export async function fetchCsrf(): Promise<void> {
  await ensureCsrfCookie()
}

export async function login(username: string, password: string): Promise<MeResponse> {
  return api.post<MeResponse>('/auth/login/', { username, password })
}

export async function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>('/auth/me/')
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout/')
}
