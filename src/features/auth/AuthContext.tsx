import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, hasSessionHint, setCsrfToken, setSessionHint, UNAUTHORIZED_EVENT } from '@/api/client'
import type { Role, User } from '@/types'

import { hasPermission } from './permissions'

interface AuthValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  /** Call after any request that started a session (password or emailed code): loads the profile and marks us signed in. */
  completeLogin: () => Promise<void>
  logout: () => Promise<void>
  /** Replace the cached profile after an edit, without refetching. */
  setUser: (user: User) => void
  refresh: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthValue | null>(null)
const ME_KEY = ['auth', 'me']

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: user = null, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => (await api.get<User>('/auth/me')).data,
    enabled: hasSessionHint(),
    retry: false,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (user?.organization_currency) {
      import('@/lib/currency').then((m) => m.setAppCurrency(user.organization_currency))
    }
  }, [user?.organization_currency])

  const endLocalSession = useCallback(() => {
    setSessionHint(false)
    setCsrfToken(null)
    qc.setQueryData(ME_KEY, null)
    qc.removeQueries({ queryKey: ME_KEY })
  }, [qc])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout') // ends the session on the server too, so a copied cookie stops working
    } catch {
      /* already signed out, or offline: either way this browser is done */
    }
    endLocalSession()
    navigate('/auth/login', { replace: true })
  }, [endLocalSession, navigate])

  useEffect(() => {
    const onUnauthorized = () => {
      endLocalSession()
      navigate('/auth/login', { replace: true })
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [endLocalSession, navigate])

  const completeLogin = useCallback(async () => {
    setSessionHint(true)
    // The /me query is disabled until a session exists, so seed it directly rather than invalidating.
    qc.setQueryData(ME_KEY, (await api.get<User>('/auth/me')).data)
  }, [qc])

  const login = useCallback(
    async (email: string, password: string) => {
      await api.post('/auth/login', { email, password }) // sets the session cookie; the response interceptor keeps the CSRF token
      await completeLogin()
    },
    [completeLogin],
  )

  const setUser = useCallback((next: User) => qc.setQueryData(ME_KEY, next), [qc])

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<User>('/auth/me')
      qc.setQueryData(ME_KEY, data)
    } catch {
      /* ignore */
    }
  }, [qc])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading: isLoading,
      login,
      completeLogin,
      logout,
      setUser,
      refresh,
      hasRole: (...roles) => !!user && roles.includes(user.role),
      can: (permission: string) => hasPermission(user, permission),
    }),
    [user, isLoading, login, completeLogin, logout, setUser, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
