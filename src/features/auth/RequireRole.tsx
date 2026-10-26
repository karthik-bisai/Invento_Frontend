import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import type { Role } from '@/types'
import { useAuth } from './AuthContext'

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { hasRole } = useAuth()
  if (hasRole(...roles)) return children
  return (
    <div className="mx-auto mt-16 max-w-sm text-center">
      <ShieldAlert className="mx-auto size-8 text-fg-subtle" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold">Access restricted</h2>
      <p className="mt-1 text-sm text-fg-muted">Your role doesn’t have permission to view this page.</p>
    </div>
  )
}
