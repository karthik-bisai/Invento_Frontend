import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { describe, expect, it } from 'vitest'
import { api } from '@/api/client'
import { httpError, makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { InventoryRow, InventorySummary, Role } from '@/types'
import { InventoryPage } from './InventoryPage'

const row = (over: Partial<InventoryRow>): InventoryRow => ({
  id: 'i1',
  product_id: 'p1',
  warehouse_id: 'w1',
  quantity_on_hand: 10,
  reserved_quantity: 1,
  available_quantity: 9,
  sku: 'BR-2040',
  product_name: 'Ball Bearing 6204-2RS',
  category: 'Bearings',
  unit_price: '3.85',
  reorder_level: 150,
  warehouse_name: 'Chicago FC',
  product_total_quantity: 75,
  ...over,
})

const ROWS: InventoryRow[] = [
  row({}), // 75 total vs reorder 150 -> Critical
  row({ id: 'i2', product_id: 'p2', sku: 'EL-3100', product_name: 'Contactor 24V 3P', category: 'Electrical', quantity_on_hand: 9, reserved_quantity: 0, available_quantity: 9, reorder_level: 40, product_total_quantity: 28, warehouse_name: 'Rotterdam DC' }), // Low Stock
  row({ id: 'i3', product_id: 'p3', sku: 'PK-9001', product_name: 'Corrugated Box', category: 'Packaging', quantity_on_hand: 1500, reserved_quantity: 150, available_quantity: 1350, reorder_level: 1000, product_total_quantity: 5400, warehouse_name: 'Singapore Hub' }), // In Stock
]

const SUMMARY: InventorySummary = {
  total_products: 8,
  total_warehouses: 3,
  total_quantity_on_hand: 8360,
  total_reserved_quantity: 833,
  total_available_quantity: 7527,
  total_value: '7995.35',
  low_stock_products: 4,
  warehouses: [],
}

interface Setup {
  role?: Role
  rows?: InventoryRow[]
  total?: number
}

/** Render the page as `role`, with /inventory served from a handler that records every request. */
function setup({ role = 'INVENTORY_MANAGER', rows = ROWS, total = rows.length }: Setup = {}) {
  signedIn()
  const inventory = vi.fn((config?: { params?: Record<string, unknown> }) => ({
    items: rows,
    total,
    page: config?.params?.page ?? 1,
    size: 15,
  }))
  const get = mockGet({
    '/auth/me': makeUser(role),
    '/inventory/summary': SUMMARY,
    '/warehouses': { items: [{ id: 'w1', name: 'Chicago FC', location: 'US' }], total: 1, page: 1, size: 100 },
    '/inventory': inventory,
  })
  renderApp(<InventoryPage />, ['/inventory'])
  return { get, inventory }
}

const table = () => screen.getByRole('table', { name: 'Inventory by product and warehouse' })
const lastParams = (inventory: ReturnType<typeof vi.fn>) => inventory.mock.lastCall?.[0]?.params

describe('InventoryPage table', () => {
  it('renders a row for each inventory record with its product, warehouse and quantities', async () => {
    setup()
    await screen.findByText('Ball Bearing 6204-2RS')

    const rows = within(table()).getAllByRole('row')
    expect(rows).toHaveLength(1 + ROWS.length) // header + data

    const bearing = within(rows[1])
    expect(bearing.getByText('BR-2040')).toBeInTheDocument()
    expect(bearing.getByText('Ball Bearing 6204-2RS')).toBeInTheDocument()
    expect(bearing.getByText('Bearings')).toBeInTheDocument()
    expect(bearing.getByText('Chicago FC')).toBeInTheDocument()
    expect(bearing.getByText('10')).toBeInTheDocument() // on hand
    expect(bearing.getByText('9')).toBeInTheDocument() // available

    expect(within(rows[3]).getByText('1,500')).toBeInTheDocument() // thousands separators
  })

  it('shows column headers, with sortable ones exposed as buttons', async () => {
    setup()
    await screen.findByText('Ball Bearing 6204-2RS')

    for (const name of ['SKU', 'Product', 'Warehouse', 'On hand', 'Reserved', 'Available']) {
      expect(within(table()).getByRole('button', { name })).toBeInTheDocument()
    }
    expect(within(table()).getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(within(table()).queryByRole('button', { name: 'Status' })).not.toBeInTheDocument()
  })

  it('badges each row Critical, Low Stock or In Stock from the product total vs its reorder level', async () => {
    setup()
    await screen.findByText('Ball Bearing 6204-2RS')
    const rows = within(table()).getAllByRole('row')

    expect(within(rows[1]).getByText('Critical')).toBeInTheDocument() // 75 <= 150/2
    expect(within(rows[2]).getByText('Low Stock')).toBeInTheDocument() // 28 <= 40 but > 20
    expect(within(rows[3]).getByText('In Stock')).toBeInTheDocument()
  })

  it('treats a product with no reorder level as In Stock however little there is', async () => {
    setup({ rows: [row({ reorder_level: 0, product_total_quantity: 0, quantity_on_hand: 0, available_quantity: 0 })] })
    await screen.findByText('Ball Bearing 6204-2RS')
    expect(within(table()).getByText('In Stock')).toBeInTheDocument()
  })

  it('shows the summary KPI cards alongside the table', async () => {
    setup()

    expect(await screen.findByText('8,360')).toBeInTheDocument() // total stock
    expect(screen.getByText('Total stock')).toBeInTheDocument()
    expect(screen.getByText('Low stock alerts')).toBeInTheDocument()
    expect(screen.getByText('Total SKUs')).toBeInTheDocument()
    expect(screen.getByText('$7,995.35')).toBeInTheDocument()
  })

  it('shows loading skeletons first, then the data', async () => {
    setup()
    expect(within(table()).queryByText('Ball Bearing 6204-2RS')).not.toBeInTheDocument()
    expect(await screen.findByText('Ball Bearing 6204-2RS')).toBeInTheDocument()
  })

  it('reports the visible range and total', async () => {
    setup({ total: 3 })
    expect(await screen.findByText('1–3 of 3')).toBeInTheDocument()
  })

  describe('empty and error states', () => {
    it('explains an empty inventory', async () => {
      setup({ rows: [], total: 0 })
      expect(await screen.findByText('No inventory records yet.')).toBeInTheDocument()
    })

    it('explains an empty search and offers a way to clear it', async () => {
      const { inventory } = setup({ rows: [], total: 0 })
      const user = userEvent.setup()

      await user.type(screen.getByRole('textbox', { name: 'Search products' }), 'zzz')

      expect(await screen.findByText('No inventory matches your filters.')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Clear' }))
      expect(screen.getByRole('textbox', { name: 'Search products' })).toHaveValue('')
      await waitFor(() => expect(lastParams(inventory)?.q).toBeUndefined())
    })

    it('shows the server error with a working Retry', async () => {
      signedIn()
      let fail = true
      mockGet({
        '/auth/me': makeUser('ADMIN'),
        '/inventory/summary': SUMMARY,
        '/warehouses': { items: [], total: 0, page: 1, size: 100 },
        '/inventory': () => {
          if (fail) throw httpError(500, 'Database unavailable')
          return { items: ROWS, total: 3, page: 1, size: 15 }
        },
      })
      renderApp(<InventoryPage />, ['/inventory'])
      const user = userEvent.setup()

      expect(await screen.findByText('Database unavailable')).toBeInTheDocument()

      fail = false
      await user.click(screen.getByRole('button', { name: 'Retry' }))
      expect(await screen.findByText('Ball Bearing 6204-2RS')).toBeInTheDocument()
      expect(screen.queryByText('Database unavailable')).not.toBeInTheDocument()
    })
  })

  describe('search, filter, sort and pagination', () => {
    it('requests page 1 sorted by name by default', async () => {
      const { inventory } = setup()
      await screen.findByText('Ball Bearing 6204-2RS')

      expect(lastParams(inventory)).toMatchObject({ page: 1, size: 15, sort_by: 'name', order: 'asc' })
    })

    it('searches the server (debounced) by name or SKU', async () => {
      const { inventory } = setup()
      await screen.findByText('Ball Bearing 6204-2RS')
      const user = userEvent.setup()

      await user.type(screen.getByRole('textbox', { name: 'Search products' }), 'bearing')

      await waitFor(() => expect(lastParams(inventory)).toMatchObject({ q: 'bearing', page: 1 }))
      // Debounced: one request for the whole word, not one per keystroke.
      const searches = inventory.mock.calls.filter(([c]) => c?.params?.q).map(([c]) => c?.params?.q)
      expect(searches).toEqual(['bearing'])
    })

    it('filters to low stock only', async () => {
      const { inventory } = setup()
      await screen.findByText('Ball Bearing 6204-2RS')
      const user = userEvent.setup()

      const toggle = screen.getByRole('button', { name: 'Low stock only' })
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
      await user.click(toggle)

      expect(toggle).toHaveAttribute('aria-pressed', 'true')
      await waitFor(() => expect(lastParams(inventory)?.low_stock).toBe(true))
    })

    it('filters by warehouse', async () => {
      const { inventory } = setup()
      await screen.findByText('Ball Bearing 6204-2RS')
      await screen.findByRole('option', { name: 'Chicago FC' })

      await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Filter by warehouse' }), 'w1')

      await waitFor(() => expect(lastParams(inventory)?.warehouse_id).toBe('w1'))
    })

    it('sorts server-side: ascending, then descending, then back to the default', async () => {
      const { inventory } = setup()
      await screen.findByText('Ball Bearing 6204-2RS')
      const user = userEvent.setup()
      const header = () => within(table()).getByRole('columnheader', { name: /On hand/ })

      await user.click(within(table()).getByRole('button', { name: 'On hand' }))
      await waitFor(() => expect(lastParams(inventory)).toMatchObject({ sort_by: 'quantity_on_hand', order: 'asc' }))
      expect(header()).toHaveAttribute('aria-sort', 'ascending')

      await user.click(within(table()).getByRole('button', { name: 'On hand' }))
      await waitFor(() => expect(lastParams(inventory)).toMatchObject({ sort_by: 'quantity_on_hand', order: 'desc' }))
      expect(header()).toHaveAttribute('aria-sort', 'descending')

      await user.click(within(table()).getByRole('button', { name: 'On hand' }))
      await waitFor(() => expect(lastParams(inventory)).toMatchObject({ sort_by: 'name', order: 'asc' }))
      expect(header()).toHaveAttribute('aria-sort', 'none')
    })

    it('pages forward and back, and disables the buttons at either end', async () => {
      const { inventory } = setup({ total: 40 }) // 15 per page -> 3 pages
      expect(await screen.findByText('1–15 of 40')).toBeInTheDocument()
      const user = userEvent.setup()
      const prev = screen.getByRole('button', { name: 'Previous page' })
      const next = screen.getByRole('button', { name: 'Next page' })
      expect(prev).toBeDisabled()

      await user.click(next)
      expect(await screen.findByText('16–30 of 40')).toBeInTheDocument()
      expect(lastParams(inventory)).toMatchObject({ page: 2 })

      await user.click(next)
      expect(await screen.findByText('31–40 of 40')).toBeInTheDocument()
      expect(next).toBeDisabled()

      await user.click(prev)
      expect(await screen.findByText('16–30 of 40')).toBeInTheDocument()
    })

    it('returns to page 1 when the filters change', async () => {
      const { inventory } = setup({ total: 40 })
      const user = userEvent.setup()
      await screen.findByText('1–15 of 40')
      await user.click(screen.getByRole('button', { name: 'Next page' }))
      await screen.findByText('16–30 of 40')

      await user.click(screen.getByRole('button', { name: 'Low stock only' }))

      await waitFor(() => expect(lastParams(inventory)).toMatchObject({ page: 1, low_stock: true }))
    })
  })

  describe('edit drawer permissions', () => {
    const openFirstRow = async () => {
      await screen.findByText('Ball Bearing 6204-2RS')
      await userEvent.setup().click(within(table()).getByText('Ball Bearing 6204-2RS'))
      return screen.findByRole('dialog')
    }

    it('lets warehouse staff edit stock counts only', async () => {
      setup({ role: 'WAREHOUSE_STAFF' })
      const dialog = within(await openFirstRow())

      expect(dialog.getByLabelText('On hand')).toHaveValue('10')
      expect(dialog.getByLabelText('Reserved')).toHaveValue('1')
      expect(dialog.queryByLabelText('Reorder level')).not.toBeInTheDocument()
      expect(dialog.queryByLabelText('Name')).not.toBeInTheDocument()
      expect(dialog.queryByLabelText('Unit price (USD)')).not.toBeInTheDocument()
    })

    it('lets inventory managers also edit the reorder level, but not other product details', async () => {
      setup({ role: 'INVENTORY_MANAGER' })
      const dialog = within(await openFirstRow())

      expect(dialog.getByLabelText('Reorder level')).toHaveValue('150')
      expect(dialog.queryByLabelText('Name')).not.toBeInTheDocument()
      expect(dialog.queryByLabelText('SKU')).not.toBeInTheDocument()
    })

    it('lets admins edit every product detail', async () => {
      setup({ role: 'ADMIN' })
      const dialog = within(await openFirstRow())

      expect(dialog.getByLabelText('Name')).toHaveValue('Ball Bearing 6204-2RS')
      expect(dialog.getByLabelText('SKU')).toHaveValue('BR-2040')
      expect(dialog.getByLabelText('Category')).toHaveValue('Bearings')
      expect(dialog.getByLabelText('Unit price (USD)')).toHaveValue('3.85')
      expect(dialog.getByLabelText('Reorder level')).toHaveValue('150')
    })

    it('keeps Save disabled until something changes', async () => {
      setup({ role: 'WAREHOUSE_STAFF' })
      const dialog = within(await openFirstRow())
      const save = dialog.getByRole('button', { name: 'Save changes' })
      expect(save).toBeDisabled()

      await userEvent.setup().type(dialog.getByLabelText('On hand'), '5')

      expect(save).toBeEnabled()
    })

    it('rejects reserving more than is on hand', async () => {
      setup({ role: 'WAREHOUSE_STAFF' })
      const dialog = within(await openFirstRow())
      const user = userEvent.setup()

      await user.clear(dialog.getByLabelText('Reserved'))
      await user.type(dialog.getByLabelText('Reserved'), '99')

      expect(dialog.getByText('Cannot exceed quantity on hand.')).toBeInTheDocument()
      expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })

    it('saves a stock count change with only the stock fields, then closes', async () => {
      const { get } = setup({ role: 'WAREHOUSE_STAFF' })
      const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} } as never)
      const dialog = within(await openFirstRow())
      const user = userEvent.setup()

      await user.clear(dialog.getByLabelText('On hand'))
      await user.type(dialog.getByLabelText('On hand'), '30')
      await user.click(dialog.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(patch).toHaveBeenCalledWith('/inventory/i1', { quantity_on_hand: 30, reserved_quantity: 1 }))
      expect(patch).toHaveBeenCalledTimes(1) // no product call for staff
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      // The table, KPIs and alerts are refreshed in the background after a successful save.
      await waitFor(() => expect(get.mock.calls.filter(([url]) => url === '/inventory').length).toBeGreaterThan(1))
    })

    it('saves only the changed product field for an admin', async () => {
      setup({ role: 'ADMIN' })
      const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} } as never)
      const dialog = within(await openFirstRow())
      const user = userEvent.setup()

      await user.clear(dialog.getByLabelText('Unit price (USD)'))
      await user.type(dialog.getByLabelText('Unit price (USD)'), '4.10')
      await user.click(dialog.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(patch).toHaveBeenCalledWith('/products/p1', { unit_price: '4.10' }))
      expect(patch).toHaveBeenCalledTimes(1) // stock untouched -> no inventory call
    })

    it('uses the dedicated reorder-level endpoint for managers', async () => {
      setup({ role: 'INVENTORY_MANAGER' })
      const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} } as never)
      const dialog = within(await openFirstRow())
      const user = userEvent.setup()

      await user.clear(dialog.getByLabelText('Reorder level'))
      await user.type(dialog.getByLabelText('Reorder level'), '200')
      await user.click(dialog.getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(patch).toHaveBeenCalledWith('/products/p1/reorder-level', { reorder_level: 200 }))
    })

    it('shows the server error and stays open when a save is rejected', async () => {
      setup({ role: 'WAREHOUSE_STAFF' })
      vi.spyOn(api, 'patch').mockRejectedValue(httpError(403, 'Insufficient permissions'))
      const dialog = within(await openFirstRow())
      const user = userEvent.setup()

      await user.type(dialog.getByLabelText('On hand'), '5')
      await user.click(dialog.getByRole('button', { name: 'Save changes' }))

      expect(await dialog.findByRole('alert')).toHaveTextContent('Insufficient permissions')
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
