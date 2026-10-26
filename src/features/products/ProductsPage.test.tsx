import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { httpError, makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { Product, Role } from '@/types'
import { ProductsPage } from './ProductsPage'

const PRODUCTS: Product[] = [
  { id: 'p1', sku: 'BR-2040', name: 'Ball Bearing', category: 'Bearings', unit_price: '3.85', reorder_level: 150 },
  { id: 'p2', sku: 'EL-3100', name: 'Contactor', category: 'Electrical', unit_price: '24.00', reorder_level: 40 },
]

function setup(role: Role) {
  signedIn()
  mockGet({
    '/auth/me': makeUser(role),
    '/products': { items: PRODUCTS, total: 2, page: 1, size: 15 },
  })
  renderApp(<ProductsPage />, ['/products'])
}

const open = async (name: string) => {
  await userEvent.setup().click(await screen.findByText(name))
  return within(await screen.findByRole('dialog'))
}

describe('ProductsPage', () => {
  it('lists products with formatted prices', async () => {
    setup('ADMIN')
    expect(await screen.findByText('Ball Bearing')).toBeInTheDocument()
    expect(screen.getByText('$3.85')).toBeInTheDocument()
    expect(screen.getByText('$24.00')).toBeInTheDocument()
  })

  it('hides "New product" from warehouse staff', async () => {
    setup('WAREHOUSE_STAFF')
    await screen.findByText('Ball Bearing')
    expect(screen.queryByRole('button', { name: /New product/ })).not.toBeInTheDocument()
  })

  it('makes the drawer read-only for warehouse staff', async () => {
    setup('WAREHOUSE_STAFF')
    const dialog = await open('Ball Bearing')
    expect(dialog.getByLabelText('Name')).toBeDisabled()
    expect(dialog.getByLabelText('Reorder level')).toBeDisabled()
    expect(dialog.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('lets managers change only the reorder level, via the dedicated endpoint', async () => {
    setup('INVENTORY_MANAGER')
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} } as never)
    const dialog = await open('Ball Bearing')
    expect(dialog.getByLabelText('Name')).toBeDisabled()
    expect(dialog.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.clear(dialog.getByLabelText('Reorder level'))
    await user.type(dialog.getByLabelText('Reorder level'), '200')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(patch).toHaveBeenCalledWith('/products/p1/reorder-level', { reorder_level: 200 }))
  })

  it('creates a product with trimmed values', async () => {
    setup('INVENTORY_MANAGER')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /New product/ }))
    const dialog = within(await screen.findByRole('dialog'))
    const create = dialog.getByRole('button', { name: 'Create product' })
    expect(create).toBeDisabled()

    await user.type(dialog.getByLabelText('SKU'), ' NW-1 ')
    await user.type(dialog.getByLabelText('Name'), 'Widget')
    await user.type(dialog.getByLabelText('Category'), 'Misc')
    await user.type(dialog.getByLabelText('Unit price (USD)'), '9.5')
    await user.click(create)

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/products', { sku: 'NW-1', name: 'Widget', category: 'Misc', unit_price: '9.5', reorder_level: 0 }),
    )
  })

  it('shows the server error when a delete is refused', async () => {
    setup('ADMIN')
    vi.spyOn(api, 'delete').mockRejectedValue(httpError(409, 'Product still has inventory records'))
    const dialog = await open('Ball Bearing')
    const user = userEvent.setup()

    await user.click(dialog.getByRole('button', { name: /Delete/ }))
    const confirm = within(await screen.findByRole('dialog', { name: 'Delete product?' }))
    await user.click(confirm.getByRole('button', { name: 'Delete' }))

    expect(await confirm.findByRole('alert')).toHaveTextContent('Product still has inventory records')
  })
})
