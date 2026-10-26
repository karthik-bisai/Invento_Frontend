import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { setThemeChoice } from '@/hooks/useTheme'
import { apiError, makeProfile, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { DeviceSession, Role } from '@/types'
import { SettingsPage } from './SettingsPage'

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1'

const SESSIONS: DeviceSession[] = [
  { id: 'a'.repeat(64), current: true, ip: '10.0.0.1', user_agent: CHROME, created_at: '2026-10-01T10:00:00Z', last_seen: new Date().toISOString() },
  { id: 'b'.repeat(64), current: false, ip: '10.0.0.2', user_agent: IPHONE, created_at: '2026-10-02T10:00:00Z', last_seen: new Date(Date.now() - 3 * 3600_000).toISOString() },
]

async function setup(role: Role = 'ADMIN', sessions = SESSIONS) {
  signedIn()
  mockGet({ '/auth/me': makeProfile(role), '/auth/sessions': { items: sessions } })
  renderApp(<SettingsPage />, ['/settings'])
  await screen.findByRole('heading', { name: 'Appearance' })
}

afterEach(() => {
  setThemeChoice('system')
  vi.restoreAllMocks()
})

describe('appearance', () => {
  it('switches the theme immediately, including back to following the device', async () => {
    await setup()
    const user = userEvent.setup()
    const dark = screen.getByRole('radio', { name: 'Dark' })
    await user.click(dark)
    expect(dark).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await user.click(screen.getByRole('radio', { name: 'Light' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await user.click(screen.getByRole('radio', { name: 'System' }))
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
  })

  it('offers all three theme choices', async () => {
    await setup()
    const group = screen.getByRole('radiogroup', { name: 'Theme' })
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['System', 'Light', 'Dark'])
  })

  it('saves toggles straight away, flipping them at once', async () => {
    await setup()
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: makeProfile('ADMIN', { preferences: { ...makeProfile('ADMIN').preferences!, compact_tables: true } }) } as never)
    const toggle = screen.getByRole('switch', { name: 'Compact tables' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    await userEvent.setup().click(toggle)

    expect(toggle).toHaveAttribute('aria-checked', 'true')
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/auth/me/preferences', { compact_tables: true }))
    expect(await screen.findByText('All changes saved.')).toBeInTheDocument()
  })

  it('puts a toggle back and says so when the server refuses', async () => {
    await setup()
    vi.spyOn(api, 'patch').mockRejectedValue(apiError(500, 'Boom'))
    const toggle = screen.getByRole('switch', { name: 'Reduce motion' })
    await userEvent.setup().click(toggle)
    expect(await screen.findByText('We couldn’t save that change, so it was undone.')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })
})

describe('notifications', () => {
  it('lets anyone turn low-stock alerts off', async () => {
    await setup('WAREHOUSE_STAFF')
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: makeProfile('WAREHOUSE_STAFF') } as never)
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Low-stock alerts' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/auth/me/preferences', { notify_low_stock: false }))
  })

  it('shows the access-request email option to admins only', async () => {
    await setup('ADMIN')
    expect(await screen.findByRole('switch', { name: 'Email me about access requests' })).toBeInTheDocument()
  })

  it('hides it from everyone else', async () => {
    await setup('INVENTORY_MANAGER')
    await screen.findByRole('switch', { name: 'Low-stock alerts' })
    expect(screen.queryByRole('switch', { name: 'Email me about access requests' })).not.toBeInTheDocument()
  })
})

describe('password', () => {
  const fill = async (current: string, next: string, confirm: string) => {
    const user = userEvent.setup()
    const form = screen.getByRole('form', { name: 'Change password' })
    if (current) await user.type(within(form).getByLabelText('Current password'), current)
    if (next) await user.type(within(form).getByLabelText('New password'), next)
    if (confirm) await user.type(within(form).getByLabelText('Confirm new password'), confirm)
    await user.click(within(form).getByRole('button', { name: 'Change password' }))
  }

  it('explains each problem and sends nothing until the form is valid', async () => {
    await setup()
    const post = vi.spyOn(api, 'post')
    await fill('', 'short', 'different')
    expect(screen.getByText('Enter your current password.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByText('Passwords don’t match.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('refuses to reuse the current password', async () => {
    await setup()
    await fill('same-password-1', 'same-password-1', 'same-password-1')
    expect(screen.getByText('Choose a password you haven’t used here.')).toBeInTheDocument()
  })

  it('changes it, tells you other devices were signed out, and clears the form', async () => {
    await setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: undefined } as never)
    await fill('old-password-1', 'brand-new-pass-2', 'brand-new-pass-2')
    expect(await screen.findByText('Password changed. Your other devices were signed out.')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/auth/me/password', { current_password: 'old-password-1', new_password: 'brand-new-pass-2' })
    expect(within(screen.getByRole('form', { name: 'Change password' })).getByLabelText('Current password')).toHaveValue('')
  })

  it('shows the server’s reason, such as a wrong current password', async () => {
    await setup()
    vi.spyOn(api, 'post').mockRejectedValue(apiError(400, 'Your current password is incorrect'))
    await fill('wrong-password', 'brand-new-pass-2', 'brand-new-pass-2')
    expect(await screen.findByRole('alert')).toHaveTextContent('Your current password is incorrect')
  })
})

describe('devices', () => {
  it('lists where you are signed in, naming each device and marking this one', async () => {
    await setup()
    expect(await screen.findByText('Chrome on Windows')).toBeInTheDocument()
    expect(screen.getByText('Safari on iOS')).toBeInTheDocument()
    expect(screen.getByText('This device')).toBeInTheDocument()
    expect(screen.getByText(/Active now/)).toBeInTheDocument()
    expect(screen.getByText(/Last active 3 hours ago/)).toBeInTheDocument()
  })

  it('signs out one other device', async () => {
    await setup()
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: undefined } as never)
    await screen.findByText('Safari on iOS')
    const row = screen.getByText('Safari on iOS').closest('li') as HTMLElement
    await userEvent.setup().click(within(row).getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith(`/auth/sessions/${'b'.repeat(64)}`))
  })

  it('offers no sign-out for this device, only for the others', async () => {
    await setup()
    await screen.findByText('Chrome on Windows')
    const row = screen.getByText('Chrome on Windows').closest('li') as HTMLElement
    expect(within(row).queryByRole('button')).not.toBeInTheDocument()
  })

  it('signs out every other device at once', async () => {
    await setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ended: 1 } } as never)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sign out other devices' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/sessions/revoke-others'))
  })

  it('hides the bulk option when this is the only device', async () => {
    await setup('ADMIN', [SESSIONS[0] as DeviceSession])
    await screen.findByText('Chrome on Windows')
    expect(screen.queryByRole('button', { name: 'Sign out other devices' })).not.toBeInTheDocument()
  })
})
