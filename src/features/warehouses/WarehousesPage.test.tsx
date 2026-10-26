import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { httpError, makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { InventorySummary, Role, Warehouse } from '@/types'
import { WarehousesPage } from './WarehousesPage'

const WAREHOUSES: Warehouse[] = [
  { id: 'w1', name: 'Chicago FC', location: 'Illinois, US' },
  { id: 'w2', name: 'Rotterdam DC', location: 'Netherlands' },
]

const SUMMARY: InventorySummary = {
  total_products: 3,
  total_warehouses: 2,
  total_quantity_on_hand: 2500,
  total_reserved_quantity: 200,
  total_available_quantity: 2300,
  total_value: '5000.00',
  low_stock_products: 0,
  warehouses: [
    { warehouse_id: 'w1', name: 'Chicago FC', quantity_on_hand: 2082, reserved_quantity: 206, total_value: '3664.75' },
    { warehouse_id: 'w2', name: 'Rotterdam DC', quantity_on_hand: 418, reserved_quantity: 40, total_value: '1335.25' },
  ],
}

function setup(role: Role) {
  signedIn()
  mockGet({
    '/auth/me': makeUser(role),
    '/warehouses': { items: WAREHOUSES, total: 2, page: 1, size: 15 },
    '/inventory/summary': SUMMARY,
  })
  renderApp(<WarehousesPage />, ['/warehouses'])
}

const open = async (name: string) => {
  await userEvent.setup().click(await screen.findByText(name))
  return within(await screen.findByRole('dialog'))
}

describe('WarehousesPage', () => {
  it('lists warehouses with their stock figures from the summary', async () => {
    setup('ADMIN')
    expect(await screen.findByText('Chicago FC')).toBeInTheDocument()
    expect(await screen.findByText('2,082')).toBeInTheDocument()
    expect(screen.getByText('$3,664.75')).toBeInTheDocument()
    expect(screen.getByText('Netherlands')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    signedIn()
    mockGet({ '/auth/me': makeUser('ADMIN'), '/warehouses': { items: [], total: 0, page: 1, size: 15 }, '/inventory/summary': SUMMARY })
    renderApp(<WarehousesPage />)
    expect(await screen.findByText('No warehouses yet.')).toBeInTheDocument()
  })

  it('shows the server error with a working Retry', async () => {
    signedIn()
    let fail = true
    mockGet({
      '/auth/me': makeUser('ADMIN'),
      '/inventory/summary': SUMMARY,
      '/warehouses': () => {
        if (fail) throw httpError(500, 'Database unavailable')
        return { items: WAREHOUSES, total: 2, page: 1, size: 15 }
      },
    })
    renderApp(<WarehousesPage />)
    expect(await screen.findByText('Database unavailable')).toBeInTheDocument()
    fail = false
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Chicago FC')).toBeInTheDocument()
  })

  it('creates a warehouse with trimmed values', async () => {
    setup('INVENTORY_MANAGER')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /New warehouse/ }))
    const dialog = within(await screen.findByRole('dialog'))
    const create = dialog.getByRole('button', { name: 'Create warehouse' })
    expect(create).toBeDisabled()

    await user.type(dialog.getByLabelText('Name'), '  Singapore Hub ')
    await user.type(dialog.getByLabelText('Location'), 'Singapore')
    await user.click(create)

    await waitFor(() => expect(post).toHaveBeenCalledWith('/warehouses', { name: 'Singapore Hub', location: 'Singapore' }))
  })

  it('makes the drawer read-only for managers, who cannot edit or delete', async () => {
    setup('INVENTORY_MANAGER')
    const dialog = await open('Chicago FC')
    expect(dialog.getByLabelText('Name')).toBeDisabled()
    expect(dialog.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    expect(dialog.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument()
  })

  it('lets admins rename a warehouse, sending only what changed', async () => {
    setup('ADMIN')
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} } as never)
    const dialog = await open('Chicago FC')
    const user = userEvent.setup()
    const save = dialog.getByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()

    await user.clear(dialog.getByLabelText('Name'))
    await user.type(dialog.getByLabelText('Name'), 'Chicago North')
    await user.click(save)

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/warehouses/w1', { name: 'Chicago North', location: 'Illinois, US' }))
  })

  it('shows the server reason when a delete is refused', async () => {
    setup('ADMIN')
    vi.spyOn(api, 'delete').mockRejectedValue(httpError(409, 'Warehouse still has inventory records'))
    const dialog = await open('Chicago FC')
    const user = userEvent.setup()

    await user.click(dialog.getByRole('button', { name: /Delete/ }))
    const confirm = within(await screen.findByRole('dialog', { name: 'Delete warehouse?' }))
    await user.click(confirm.getByRole('button', { name: 'Delete' }))

    expect(await confirm.findByRole('alert')).toHaveTextContent('Warehouse still has inventory records')
  })
})
