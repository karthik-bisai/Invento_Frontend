import { useEffect, useRef } from 'react'
import { useUpdatePreferences } from '@/features/account/hooks'
import { useAuth } from '@/features/auth/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { DEFAULT_PREFERENCES, type ThemePreference } from '@/types'

/**
 * Makes the signed-in user's saved preferences real: density and motion become attributes on <html>, and the
 * theme is kept in step with the server so it follows them to another device. Renders nothing.
 */
export function PreferencesSync() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const update = useUpdatePreferences()
  const prefs = { ...DEFAULT_PREFERENCES, ...user?.preferences }
  const onServer = useRef<{ userId: string; theme: ThemePreference } | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.compact = String(prefs.compact_tables)
    if (prefs.reduce_motion) root.dataset.motion = 'reduce'
    else delete root.dataset.motion
  }, [prefs.compact_tables, prefs.reduce_motion])

  // Leaving the signed-in area (sign out) must not leave one person's density or motion settings behind.
  useEffect(
    () => () => {
      delete document.documentElement.dataset.compact
      delete document.documentElement.dataset.motion
    },
    [],
  )

  useEffect(() => {
    if (!user) return
    const known = onServer.current
    if (!known || known.userId !== user.id) {
      onServer.current = { userId: user.id, theme: prefs.theme } // first load for this person: the server's choice wins
      if (prefs.theme !== theme) setTheme(prefs.theme)
      return
    }
    if (theme !== known.theme) {
      known.theme = theme // they changed it here (top bar or Settings): save it
      update.mutate({ theme })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, theme, prefs.theme])

  return null
}
