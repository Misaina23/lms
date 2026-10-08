import type { User } from '@/lib/api'

export const PORTAL_ROLES = new Set(['ADMIN', 'PROFESSEUR', 'SURVEILLANT', 'SECRETARIAT'])

export function isValidPortalRole(role: string | null | undefined): boolean {
  return !!role && PORTAL_ROLES.has(role)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const rawUser = localStorage.getItem('user')
  if (!rawUser) return null

  try {
    const parsedUser = JSON.parse(rawUser) as User
    return isValidPortalRole(parsedUser?.role) ? parsedUser : null
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}
