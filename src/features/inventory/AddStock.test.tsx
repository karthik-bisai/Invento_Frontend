import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { apiError, makeProfile, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { InventoryRow, InventorySummary, Product, Role } from '@/types'
import { InventoryPage } from './InventoryPage'
import { StockedList } from './StockedList'

const PRODUCTS: Product[] = [
  { id: 'p1', sku: 'FS-1180', name: 'Hex Bolt M8', category: 'Fasteners', unit_price: '0.18', reorder_level: 200 },
  { id: 'p2', sku: 'BR-2040', name: 'Ball Bearing', category: 'Bearings', unit_price: '3.85', reorder_level: 150 },
]
const WAREHOUSES = [
  { id: 'w1', name: 'Chicago FC', location: 'US' },
  { id: 'w2', name: 'Rotterdam DC', location: 'NL' },
]
const SUMMARY: InventorySummary = { total_products: 2, total_warehouses: 2, total_quantity_on_hand: 0, total_reserved_quantity: 0, total_available_quantity: 0, total_value: '0', low_stock_products: 0, warehouses: [] }

const row = (over: Partial<InventoryRow>): InventoryRow => ({
  id: 'i1', product_id: 'p1', warehouse_id: 'w1', quantity_on_hand: 260, reserved_quantity: 0, available_quantity: 260,
  sku: 'FS-1180', product_name: 'Hex Bolt M8', category: 'Fasteners', unit_price: '0.18', reorder_level: 200, warehouse_name: 'Chicago FC', product_total_quantity: 260, ...over,
})

function setupInventory(role: Role = 'INVENTORY_MANAGER', path = '/inventory') {
  signedIn()
  const products = vi.fn((config?: { params?: Record<string, unknown> }) => {
    const q = String(config?.params?.q ?? '').toLowerCase()
    const items = PRODUCTS.filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    return { items, total: items.length, page: 1, size: 8 }
  })
  mockGet({
    '/auth/me': makeProfile(role),
    '/inventory/summary': SUMMARY,
    '/warehouses': { items: WAREHOUSES, total: 2, page: 1, size: 100 },
    '/inventory': { items: [], total: 0, page: 1, size: 15 },
    '/products': products,
    '/products/p1': PRODUCTS[0],
  })
  renderApp(<InventoryPage />, [path])
}

afterEach(() => vi.restoreAllMocks())

describe('Add stock', () => {
  it('is offered to admins and managers, not to warehouse staff', async () => {
    setupInventory('INVENTORY_MANAGER')
    expect(await screen.findByRole('button', { name: 'Add stock' })).toBeInTheDocument()
  })

  it('is hidden from warehouse staff', async () => {
    setupInventory('WAREHOUSE_STAFF')
    await screen.findByRole('textbox', { name: 'Search products' })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Add stock' })).not.toBeInTheDocument())
  })

  it('puts a product into a warehouse: search, choose, set counts, save', async () => {
    setupInventory()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add stock' }))
    const drawer = within(await screen.findByRole('dialog'))

    await user.type(drawer.getByPlaceholderText('Search name or SKU…'), 'bolt')
    await user.click(await drawer.findByRole('button', { name: /Hex Bolt M8/ }))
    expect(drawer.getByText('FS-1180')).toBeInTheDocument()
    expect(drawer.getByRole('button', { name: 'Change' })).toBeInTheDocument()

    await user.selectOptions(drawer.getByLabelText('Warehouse'), 'w2')
    await user.clear(drawer.getByLabelText('On hand'))
    await user.type(drawer.getByLabelText('On hand'), '120')
    await user.clear(drawer.getByLabelText('Reserved'))
    await user.type(drawer.getByLabelText('Reserved'), '20')
    expect(drawer.getByText('Available: 100')).toBeInTheDocument()
    await user.click(drawer.getByRole('button', { name: 'Add stock' }))

    await waitFor(() => expect(post).toHaveBeenCalledWith('/inventory', { product_id: 'p1', warehouse_id: 'w2', quantity_on_hand: 120, reserved_quantity: 20 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('says what is missing instead of sending an incomplete record', async () => {
    setupInventory()
    const post = vi.spyOn(api, 'post')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add stock' }))
    const drawer = within(await screen.findByRole('dialog'))
    await user.click(drawer.getByRole('button', { name: 'Add stock' }))
    expect(drawer.getByText('Choose a product.')).toBeInTheDocument()
    expect(drawer.getByText('Choose a warehouse.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('will not reserve more than is on hand', async () => {
    setupInventory()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add stock' }))
    const drawer = within(await screen.findByRole('dialog'))
    await user.clear(drawer.getByLabelText('On hand'))
    await user.type(drawer.getByLabelText('On hand'), '5')
    await user.clear(drawer.getByLabelText('Reserved'))
    await user.type(drawer.getByLabelText('Reserved'), '9')
    await user.click(drawer.getByRole('button', { name: 'Add stock' }))
    expect(drawer.getByText('Cannot exceed quantity on hand.')).toBeInTheDocument()
  })

  it('explains a duplicate and points to the table', async () => {
    setupInventory()
    vi.spyOn(api, 'post').mockRejectedValue(apiError(409, 'Product already stocked in this warehouse'))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add stock' }))
    const drawer = within(await screen.findByRole('dialog'))
    await user.type(drawer.getByPlaceholderText('Search name or SKU…'), 'bolt')
    await user.click(await drawer.findByRole('button', { name: /Hex Bolt M8/ }))
    await user.selectOptions(drawer.getByLabelText('Warehouse'), 'w1')
    await user.click(drawer.getByRole('button', { name: 'Add stock' }))
    expect(await drawer.findByRole('alert')).toHaveTextContent('already stocked in that warehouse')
  })

  it('opens with the product already chosen when arriving from a product', async () => {
    setupInventory('ADMIN', '/inventory?addProduct=p1')
    const drawer = within(await screen.findByRole('dialog'))
    expect(await drawer.findByText('Hex Bolt M8')).toBeInTheDocument()
    expect(drawer.getByRole('button', { name: 'Change' })).toBeInTheDocument()
  })

  it('opens with the warehouse already chosen when arriving from a warehouse', async () => {
    setupInventory('ADMIN', '/inventory?addWarehouse=w2')
    const drawer = within(await screen.findByRole('dialog'))
    await waitFor(() => expect(drawer.getByLabelText('Warehouse')).toHaveValue('w2'))
  })

  it('lets you pick a different product after choosing one', async () => {
    setupInventory()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add stock' }))
    const drawer = within(await screen.findByRole('dialog'))
    await user.type(drawer.getByPlaceholderText('Search name or SKU…'), 'bolt')
    await user.click(await drawer.findByRole('button', { name: /Hex Bolt M8/ }))
    await user.click(drawer.getByRole('button', { name: 'Change' }))
    expect(drawer.getByPlaceholderText('Search name or SKU…')).toBeInTheDocument()
  })
})

describe('StockedList', () => {
  function renderList(role: Role, props: { productId: string } | { warehouseId: string }, rows: InventoryRow[]) {
    signedIn()
    const inventory = vi.fn(() => ({ items: rows, total: rows.length, page: 1, size: 100 }))
    mockGet({ '/auth/me': makeProfile(role), '/inventory': inventory })
    renderApp('productId' in props ? <StockedList productId={props.productId} /> : <StockedList warehouseId={props.warehouseId} />)
    return { inventory }
  }

  it('shows which warehouses hold a product, with the count in each', async () => {
    const { inventory } = renderList('ADMIN', { productId: 'p1' }, [row({}), row({ id: 'i2', warehouse_id: 'w2', warehouse_name: 'Rotterdam DC', quantity_on_hand: 90 })])
    const list = await screen.findByRole('list')
    expect(within(list).getByText('Chicago FC')).toBeInTheDocument()
    expect(within(list).getByText('260')).toBeInTheDocument()
    expect(within(list).getByText('Rotterdam DC')).toBeInTheDocument()
    expect(within(list).getByText('90')).toBeInTheDocument()
    expect(inventory.mock.calls[0]).toBeDefined()
    expect(screen.getByRole('link', { name: 'Add stock' })).toHaveAttribute('href', '/inventory?addProduct=p1')
  })

  it('shows what a warehouse holds, with each product’s SKU', async () => {
    renderList('INVENTORY_MANAGER', { warehouseId: 'w1' }, [row({})])
    const list = await screen.findByRole('list')
    expect(within(list).getByText('Hex Bolt M8')).toBeInTheDocument()
    expect(within(list).getByText('FS-1180')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Holds' })).toBeInTheDocument()
  })

  it('points an unstocked product at Add stock', async () => {
    renderList('ADMIN', { productId: 'p9' }, [])
    expect(await screen.findByText('This product isn’t stocked in any warehouse yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add stock' })).toHaveAttribute('href', '/inventory?addProduct=p9')
  })

  it('points an empty warehouse at Add stock', async () => {
    renderList('ADMIN', { warehouseId: 'w9' }, [])
    expect(await screen.findByText('Nothing is stored in this warehouse yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add stock' })).toHaveAttribute('href', '/inventory?addWarehouse=w9')
  })

  it('shows warehouse staff the facts but no way to change them', async () => {
    renderList('WAREHOUSE_STAFF', { productId: 'p1' }, [])
    expect(await screen.findByText('This product isn’t stocked in any warehouse yet.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add stock' })).not.toBeInTheDocument()
  })
})
