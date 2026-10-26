import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { apiError, makeProfile, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { AccessRequest } from '@/types'
import { UsersPage } from './UsersPage'

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

const PENDING: AccessRequest = { id: 'r1', status: 'PENDING', created_at: ago(2 * 3600_000), user: { id: 'u9', email: 'nia@acme.com', full_name: 'Nia New', avatar_url: null } }
const PENDING_2: AccessRequest = { id: 'r2', status: 'PENDING', created_at: ago(5 * 60_000), user: { id: 'u10', email: 'sam@acme.com', full_name: null, avatar_url: null } }
const APPROVED: AccessRequest = { id: 'r3', status: 'APPROVED', created_at: ago(3 * 86400_000), decided_at: ago(86400_000), user: { id: 'u11', email: 'old@acme.com', full_name: 'Olu Old', avatar_url: null } }
const REJECTED: AccessRequest = { id: 'r4', status: 'REJECTED', created_at: ago(4 * 86400_000), decided_at: ago(2 * 86400_000), note: 'No capacity', user: { id: 'u12', email: 'no@acme.com', full_name: null, avatar_url: null } }

function setup(path = '/users?tab=requests', all: AccessRequest[] = [PENDING, PENDING_2, APPROVED, REJECTED]) {
  signedIn()
  const requests = vi.fn((config?: { params?: Record<string, unknown> }) => {
    const status = config?.params?.status as string | undefined
    const items = status ? all.filter((r) => r.status === status) : all
    return { items, total: items.length, page: 1, size: 10 }
  })
  mockGet({
    '/auth/me': makeProfile('ADMIN'),
    '/auth/users': { items: [], total: 0, page: 1, size: 15 },
    '/access-requests': requests,
  })
  renderApp(<UsersPage />, [path])
  return { requests }
}

afterEach(() => vi.restoreAllMocks())

describe('Users tabs', () => {
  it('flags how many people are waiting on the Requests tab', async () => {
    setup('/users')
    const tab = await screen.findByRole('tab', { name: /Requests/ })
    await waitFor(() => expect(within(tab).getByText('2')).toBeInTheDocument())
  })

  it('opens on People by default and switches to Requests without leaving the page', async () => {
    setup('/users')
    const user = userEvent.setup()
    expect(await screen.findByRole('tab', { name: 'People', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Search users' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Requests/ }))
    expect(screen.getByRole('tab', { name: /Requests/, selected: true })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'Access requests' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Search users' })).not.toBeInTheDocument()
  })

  it('can be opened straight onto Requests from a notification link', async () => {
    setup('/users?tab=requests')
    expect(await screen.findByRole('table', { name: 'Access requests' })).toBeInTheDocument()
  })
})

describe('Requests', () => {
  it('lists who is waiting, with their name, email and how long ago they asked', async () => {
    setup()
    const table = await screen.findByRole('table', { name: 'Access requests' })
    await within(table).findByText('Nia New')
    expect(within(table).getByText('nia@acme.com')).toBeInTheDocument()
    expect(within(table).getByText('2 hours ago')).toBeInTheDocument()
    expect(within(table).getByText('5 minutes ago')).toBeInTheDocument()
    expect(within(table).getByText('sam@acme.com')).toBeInTheDocument() // no name: falls back to the email
    expect(within(table).queryByText('Olu Old')).not.toBeInTheDocument() // pending only by default
  })

  it('approves as warehouse staff by default', async () => {
    setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...PENDING, status: 'APPROVED' } } as never)
    await screen.findByText('Nia New')
    const row = screen.getByText('Nia New').closest('tr') as HTMLElement
    await userEvent.setup().click(within(row).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/access-requests/r1/approve', { role: 'WAREHOUSE_STAFF' }))
  })

  it('approves with the role the admin picked', async () => {
    setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...PENDING, status: 'APPROVED' } } as never)
    await screen.findByText('Nia New')
    const row = screen.getByText('Nia New').closest('tr') as HTMLElement
    const user = userEvent.setup()
    await user.selectOptions(within(row).getByLabelText('Role for Nia New'), 'INVENTORY_MANAGER')
    await user.click(within(row).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/access-requests/r1/approve', { role: 'INVENTORY_MANAGER' }))
  })

  it('refreshes the lists after a decision', async () => {
    const { requests } = setup()
    vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    await screen.findByText('Nia New')
    const before = requests.mock.calls.length
    const row = screen.getByText('Nia New').closest('tr') as HTMLElement
    await userEvent.setup().click(within(row).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(requests.mock.calls.length).toBeGreaterThan(before))
  })

  it('declines with an optional reason that goes into the email', async () => {
    setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...PENDING, status: 'REJECTED' } } as never)
    await screen.findByText('Nia New')
    const row = screen.getByText('Nia New').closest('tr') as HTMLElement
    const user = userEvent.setup()
    await user.click(within(row).getByRole('button', { name: 'Decline' }))

    const dialog = within(await screen.findByRole('dialog', { name: 'Decline this request?' }))
    expect(dialog.getByText(/Nia New will get an email/)).toBeInTheDocument()
    await user.type(dialog.getByLabelText(/Reason/), 'No capacity right now')
    await user.click(dialog.getByRole('button', { name: 'Decline request' }))

    await waitFor(() => expect(post).toHaveBeenCalledWith('/access-requests/r1/reject', { note: 'No capacity right now' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('declines without a reason, sending none', async () => {
    setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    await screen.findByText('Nia New')
    const row = screen.getByText('Nia New').closest('tr') as HTMLElement
    const user = userEvent.setup()
    await user.click(within(row).getByRole('button', { name: 'Decline' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Decline request' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/access-requests/r1/reject', { note: null }))
  })

  it('cancelling the decline dialog changes nothing', async () => {
    setup()
    const post = vi.spyOn(api, 'post')
    await screen.findByText('Nia New')
    const row = screen.getByText('Nia New').closest('tr') as HTMLElement
    const user = userEvent.setup()
    await user.click(within(row).getByRole('button', { name: 'Decline' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(post).not.toHaveBeenCalled()
  })

  it('shows why a decision failed, such as someone else deciding first', async () => {
    setup()
    vi.spyOn(api, 'post').mockRejectedValue(apiError(409, 'This request was already approved'))
    await screen.findByText('Nia New')
    const row = screen.getByText('Nia New').closest('tr') as HTMLElement
    await userEvent.setup().click(within(row).getByRole('button', { name: 'Approve' }))
    expect(await within(row).findByRole('alert')).toHaveTextContent('already approved')
  })

  it('filters by outcome and shows past decisions with their reason', async () => {
    const { requests } = setup()
    const user = userEvent.setup()
    await screen.findByText('Nia New')

    await user.click(screen.getByRole('radio', { name: 'Declined' }))
    expect(await screen.findByText('no@acme.com')).toBeInTheDocument()
    expect(screen.getByText(/“No capacity”/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument() // decided requests can't be decided again
    await waitFor(() => expect(requests.mock.lastCall?.[0]?.params?.status).toBe('REJECTED'))

    await user.click(screen.getByRole('radio', { name: 'All' }))
    await waitFor(() => expect(requests.mock.lastCall?.[0]?.params?.status).toBeUndefined())
    expect(await screen.findByText('Olu Old')).toBeInTheDocument()
  })

  it('invites you back later when no one is waiting', async () => {
    setup('/users?tab=requests', [])
    expect(await screen.findByText(/No one is waiting for access/)).toBeInTheDocument()
  })

  it('reports a load failure with a way to retry', async () => {
    signedIn()
    let fail = true
    mockGet({
      '/auth/me': makeProfile('ADMIN'),
      '/auth/users': { items: [], total: 0, page: 1, size: 15 },
      '/access-requests': () => {
        if (fail) throw apiError(500, 'Database unavailable')
        return { items: [PENDING], total: 1, page: 1, size: 10 }
      },
    })
    renderApp(<UsersPage />, ['/users?tab=requests'])
    expect(await screen.findByText('Database unavailable')).toBeInTheDocument()
    fail = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Nia New')).toBeInTheDocument()
  })
})
