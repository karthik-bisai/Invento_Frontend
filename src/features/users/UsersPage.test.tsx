import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { User } from '@/types'
import { UsersPage } from './UsersPage'

const me = makeUser('ADMIN')
const staff: User = { id: 'u2', email: 'staff@acme.com', role: 'WAREHOUSE_STAFF', is_active: true }

function setup() {
  signedIn()
  mockGet({
    '/auth/me': me,
    '/auth/users': { items: [me, staff], total: 2, page: 1, size: 15 },
    '/access-requests': { items: [], total: 0, page: 1, size: 1 },
  })
  renderApp(<UsersPage />, ['/users'])
}

const open = async (email: string) => {
  await userEvent.setup().click(await screen.findByText(email))
  return within(await screen.findByRole('dialog'))
}

describe('UsersPage', () => {
  it('lists users with role and status badges and marks the current user', async () => {
    setup()
    expect(await screen.findByText('staff@acme.com')).toBeInTheDocument()
    expect(screen.getByText('(you)')).toBeInTheDocument()
    expect(screen.getByText('Warehouse Staff')).toBeInTheDocument()
    expect(screen.getAllByText('Active')).toHaveLength(2)
  })

  it('sends only the changed fields when updating a user', async () => {
    setup()
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} } as never)
    const dialog = await open('staff@acme.com')
    const user = userEvent.setup()

    await user.selectOptions(dialog.getByLabelText('Role'), 'INVENTORY_MANAGER')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/auth/users/u2', { role: 'INVENTORY_MANAGER' }))
  })

  it('stops admins demoting or deactivating themselves', async () => {
    setup()
    const dialog = await open(me.email)
    expect(dialog.getByLabelText('Role')).toBeDisabled()
    expect(dialog.getByRole('checkbox', { name: /Active/ })).toBeDisabled()
  })

  it('validates the password when creating a user', async () => {
    setup()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /New user/ }))
    const dialog = within(await screen.findByRole('dialog'))

    await user.type(dialog.getByLabelText('Email'), 'new@acme.com')
    await user.type(dialog.getByLabelText('Password'), 'short')
    expect(dialog.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Create user' })).toBeDisabled()

    await user.type(dialog.getByLabelText('Password'), 'longer')
    await user.click(dialog.getByRole('button', { name: 'Create user' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/auth/users', { email: 'new@acme.com', password: 'shortlonger', role: 'WAREHOUSE_STAFF' }),
    )
  })
})
