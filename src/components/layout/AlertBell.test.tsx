import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { makeProfile, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { AppNotification, LowStockItem, Preferences } from '@/types'
import { AlertBell } from './AlertBell'

const note = (over: Partial<AppNotification>): AppNotification => ({
  id: 'n1',
  kind: 'access_requested',
  title: 'New access request',
  body: 'Nia New is asking for access.',
  link: '/users?tab=requests',
  read_at: null,
  created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
  ...over,
})

const LOW: LowStockItem[] = [
  { product_id: 'p1', sku: 'BR-2040', name: 'Ball Bearing', quantity_on_hand: 60, reorder_level: 150, status: 'critical' },
  { product_id: 'p2', sku: 'EL-3100', name: 'Contactor', quantity_on_hand: 28, reorder_level: 40, status: 'low' },
]

function setup(opts: { notes?: AppNotification[]; unread?: number; low?: LowStockItem[]; prefs?: Partial<Preferences> } = {}) {
  const notes = opts.notes ?? [note({}), note({ id: 'n2', title: 'Your access was approved', body: null, link: null, read_at: '2026-10-01T00:00:00Z' })]
  signedIn()
  const inbox = vi.fn(() => ({ items: notes, unread: opts.unread ?? notes.filter((n) => !n.read_at).length }))
  mockGet({
    '/auth/me': makeProfile('ADMIN', { preferences: { ...makeProfile('ADMIN').preferences!, ...opts.prefs } }),
    '/notifications': inbox,
    '/inventory/low-stock': opts.low ?? LOW,
  })
  renderApp(
    <>
      <AlertBell />
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/users" element={<p>Users page</p>} />
        <Route path="/inventory" element={<p>Inventory page</p>} />
      </Routes>
    </>,
    ['/'],
  )
  return { inbox }
}

const bell = () => screen.findByRole('button', { name: /alerts?$/ })

afterEach(() => vi.restoreAllMocks())

describe('AlertBell', () => {
  it('counts unread notifications and low-stock items together', async () => {
    setup()
    expect(await screen.findByRole('button', { name: '3 alerts' })).toBeInTheDocument() // 1 unread + 2 low stock
  })

  it('shows no count when nothing needs attention', async () => {
    setup({ notes: [], low: [] })
    expect(await screen.findByRole('button', { name: 'No alerts' })).toBeInTheDocument()
  })

  it('opens on the notifications tab when something is unread, and lists them with their age', async () => {
    setup()
    await userEvent.setup().click(await screen.findByRole('button', { name: '3 alerts' }))
    expect(screen.getByRole('tab', { name: /Notifications/, selected: true })).toBeInTheDocument()
    expect(screen.getByText('New access request')).toBeInTheDocument()
    expect(screen.getByText('Nia New is asking for access.')).toBeInTheDocument()
    expect(screen.getAllByText('10 minutes ago')).toHaveLength(2) // one per notification
    expect(screen.getByText('Unread')).toBeInTheDocument()
  })

  it('opens on low stock when the inbox is all read', async () => {
    setup({ notes: [note({ read_at: '2026-10-01T00:00:00Z' })] })
    await userEvent.setup().click(await screen.findByRole('button', { name: '2 alerts' }))
    expect(screen.getByRole('tab', { name: /Low stock/, selected: true })).toBeInTheDocument()
    expect(screen.getByText('Ball Bearing')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View inventory' })).toHaveAttribute('href', '/inventory?low=1')
  })

  it('marks a notification read and goes where it points', async () => {
    setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: undefined } as never)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '3 alerts' }))
    await user.click(screen.getByRole('button', { name: /New access request/ }))

    await waitFor(() => expect(post).toHaveBeenCalledWith('/notifications/n1/read'))
    expect(await screen.findByText('Users page')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Alerts' })).not.toBeInTheDocument() // the menu closes
  })

  it('does not re-mark one that is already read', async () => {
    setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: undefined } as never)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '3 alerts' }))
    await user.click(screen.getByRole('button', { name: /Your access was approved/ }))
    expect(post).not.toHaveBeenCalled()
  })

  it('marks everything read in one go', async () => {
    setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: undefined } as never)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '3 alerts' }))
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/notifications/read-all'))
  })

  it('has no "mark all" when there is nothing unread', async () => {
    setup({ notes: [note({ read_at: '2026-10-01T00:00:00Z' })] })
    await userEvent.setup().click(await screen.findByRole('button', { name: '2 alerts' }))
    await userEvent.setup().click(screen.getByRole('tab', { name: /Notifications/ }))
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument()
  })

  it('lets you flip between the two tabs', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '3 alerts' }))
    await user.click(screen.getByRole('tab', { name: /Low stock/ }))
    const panel = screen.getByRole('region', { name: 'Alerts' })
    expect(within(panel).getByText('Contactor')).toBeInTheDocument()
    expect(within(panel).queryByText('New access request')).not.toBeInTheDocument()
  })

  it('leaves low-stock items out when the user turned those alerts off', async () => {
    setup({ prefs: { notify_low_stock: false } })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '1 alerts' }))
    await user.click(screen.getByRole('tab', { name: /Low stock/ }))
    expect(screen.getByText('Low-stock alerts are turned off in Settings.')).toBeInTheDocument()
    expect(screen.queryByText('Ball Bearing')).not.toBeInTheDocument()
  })

  it('has a calm empty state', async () => {
    setup({ notes: [], low: [] })
    await userEvent.setup().click(await bell())
    expect(screen.getByText(/Nothing new/)).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '3 alerts' }))
    expect(screen.getByRole('region', { name: 'Alerts' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Alerts' })).not.toBeInTheDocument()
  })

  it('clears an individual notification', async () => {
    setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: undefined } as never)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '3 alerts' }))
    const clearButtons = screen.getAllByRole('button', { name: 'Clear notification' })
    await user.click(clearButtons[0])
    await waitFor(() => expect(post).toHaveBeenCalledWith('/notifications/n1/clear'))
  })

  it('opens notification details modal', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '3 alerts' }))
    const viewButtons = screen.getAllByRole('button', { name: 'View details' })
    await user.click(viewButtons[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Why was this generated?')).toBeInTheDocument()
  })
})
