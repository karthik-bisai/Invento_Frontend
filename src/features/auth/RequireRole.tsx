import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import type { Role } from '@/types'
import { useAuth } from './AuthContext'

export function RequireRole({
  roles,
  permission,
  children,
}: {
  roles?: Role[]
  permission?: string
  children: ReactNode
}) {
  const { user, hasRole, can } = useAuth()
  if (!user) return null

  // Admin role always has access
  if (String(user.role).toUpperCase() === 'ADMIN') return children

  // Permission-based check if provided
  if (permission && can(permission)) return children

  // Role fallback if provided
  if (roles && roles.length > 0 && hasRole(...roles)) return children

  // If neither specified, allow
  if (!permission && (!roles || roles.length === 0)) return children

  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <ShieldAlert className="mx-auto size-8 text-crit-fg" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold">Access restricted</h2>
      <p className="mt-1 text-sm text-fg-muted">Your role doesn’t have permission to view this page.</p>
    </div>
  )
}
