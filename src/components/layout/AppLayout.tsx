import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { Dock } from './Dock'
import { PreferencesSync } from './PreferencesSync'

export function AppLayout() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  if (loading) return <div className="grid min-h-screen place-items-center text-sm text-fg-muted">Loading…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />

  return (
    <div className="min-h-screen">
      <PreferencesSync />
      {/* Keyed by route so each page eases in; bottom padding keeps content clear of the dock. */}
      <main className="mx-auto w-full max-w-[1720px] px-4 pb-36 pt-6 sm:px-6 sm:pb-40 lg:px-8">
        <div key={pathname} className="animate-rise">
          <Suspense fallback={<div role="status" aria-label="Loading page" className="skeleton h-64 rounded-lg" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
      <Dock />
    </div>
  )
}
