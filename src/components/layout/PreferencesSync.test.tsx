import { waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { setThemeChoice } from '@/hooks/useTheme'
import { makeProfile, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { Preferences } from '@/types'
import { PreferencesSync } from './PreferencesSync'

const prefs = (over: Partial<Preferences>): Preferences => ({ ...makeProfile('ADMIN').preferences!, ...over })

function setup(over: Partial<Preferences>) {
  signedIn()
  mockGet({ '/auth/me': makeProfile('ADMIN', { preferences: prefs(over) }) })
  return renderApp(<PreferencesSync />)
}

afterEach(() => {
  setThemeChoice('system')
  vi.restoreAllMocks()
  delete document.documentElement.dataset.compact
  delete document.documentElement.dataset.motion
})

describe('PreferencesSync', () => {
  it('applies compact tables and reduced motion from the saved settings', async () => {
    setup({ compact_tables: true, reduce_motion: true })
    await waitFor(() => expect(document.documentElement.dataset.compact).toBe('true'))
    expect(document.documentElement.dataset.motion).toBe('reduce')
  })

  it('leaves the defaults alone when nothing special is saved', async () => {
    setup({})
    await waitFor(() => expect(document.documentElement.dataset.compact).toBe('false'))
    expect(document.documentElement.dataset.motion).toBeUndefined()
  })

  it('clears one person’s settings when the signed-in area goes away', async () => {
    const { unmount } = setup({ compact_tables: true, reduce_motion: true })
    await waitFor(() => expect(document.documentElement.dataset.compact).toBe('true'))
    unmount()
    expect(document.documentElement.dataset.compact).toBeUndefined()
    expect(document.documentElement.dataset.motion).toBeUndefined()
  })

  it('adopts the theme saved on the account without writing it straight back', async () => {
    const patch = vi.spyOn(api, 'patch')
    setup({ theme: 'dark' })
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    await new Promise((r) => setTimeout(r, 20))
    expect(patch).not.toHaveBeenCalled()
  })

  it('saves a theme change made on this device', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: makeProfile('ADMIN', { preferences: prefs({ theme: 'light' }) }) } as never)
    setup({ theme: 'system', compact_tables: true })
    await waitFor(() => expect(document.documentElement.dataset.compact).toBe('true')) // only true once the user has loaded

    act(() => setThemeChoice('light'))

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/auth/me/preferences', { theme: 'light' }))
    expect(patch).toHaveBeenCalledTimes(1)
  })
})
