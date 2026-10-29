import type { User } from '@/types'

/**
 * Checks whether the given user has the specified permission.
 * Administrators with role ADMIN always have full privileges.
 */
export function hasPermission(user: User | null | undefined, permission: string): boolean {
  if (!user) return false

  const roleStr = String(user.role || '').toUpperCase()
  if (roleStr === 'ADMIN') return true

  if (!user.permissions || !Array.isArray(user.permissions)) {
    return false
  }

  if (user.permissions.includes(permission) || user.permissions.includes('*')) {
    return true
  }

  const [module] = permission.split(':')
  if (module && user.permissions.includes(`${module}:*`)) {
    return true
  }

  return false
}

/**
 * Checks if user has ANY of the specified permissions.
 */
export function hasAnyPermission(user: User | null | undefined, ...permissions: string[]): boolean {
  if (!user) return false
  if (String(user.role || '').toUpperCase() === 'ADMIN') return true
  return permissions.some((p) => hasPermission(user, p))
}

/**
 * Checks if user has ALL of the specified permissions.
 */
export function hasAllPermissions(user: User | null | undefined, ...permissions: string[]): boolean {
  if (!user) return false
  if (String(user.role || '').toUpperCase() === 'ADMIN') return true
  return permissions.every((p) => hasPermission(user, p))
}
