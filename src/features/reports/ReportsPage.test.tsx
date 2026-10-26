import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { InventorySummary, LowStockItem } from '@/types'
import { ReportsPage } from './ReportsPage'

const SUMMARY: InventorySummary = {
  total_products: 6,
  total_warehouses: 2,
  total_quantity_on_hand: 6577,
  total_reserved_quantity: 650,
  total_available_quantity: 5927,
  total_value: '9103.55',
  low_stock_products: 2,
  warehouses: [
    { warehouse_id: 'w1', name: 'Chicago FC', quantity_on_hand: 2082, reserved_quantity: 206, total_value: '6827.75' },
    { warehouse_id: 'w2', name: 'Rotterdam DC', quantity_on_hand: 4495, reserved_quantity: 444, total_value: '2275.80' },
  ],
}

const LOW: LowStockItem[] = [
  { product_id: 'p1', sku: 'BR-2040', name: 'Ball Bearing', quantity_on_hand: 60, reorder_level: 150, status: 'critical' },
  { product_id: 'p2', sku: 'EL-3100', name: '=Contactor', quantity_on_hand: 28, reorder_level: 40, status: 'low' },
]

function setup(low: LowStockItem[] = LOW) {
  signedIn()
  mockGet({ '/auth/me': makeUser('INVENTORY_MANAGER'), '/inventory/summary': SUMMARY, '/inventory/low-stock': low })
  renderApp(<ReportsPage />, ['/reports'])
}

describe('ReportsPage', () => {
  it('shows the key figures, warehouse breakdown and replenishment list', async () => {
    setup()
    expect(await screen.findByText('6,577')).toBeInTheDocument()
    const warehouses = screen.getByRole('table', { name: 'Stock by warehouse' })
    expect(within(warehouses).getByText('Chicago FC')).toBeInTheDocument()
    expect(within(warehouses).getByText('$6,827.75')).toBeInTheDocument()
    expect(within(warehouses).getByText('75%')).toBeInTheDocument() // 6827.75 of 9103.55
    const low = screen.getByRole('table', { name: 'Products at or below their reorder level' })
    expect(within(low).getByText('BR-2040')).toBeInTheDocument()
    expect(within(low).getByText('Critical')).toBeInTheDocument()
    expect(within(low).getByText('Low Stock')).toBeInTheDocument()
    expect(within(low).getByText('60')).toBeInTheDocument()
  })

  it('computes the shortfall against the reorder level', async () => {
    setup()
    const low = await screen.findByRole('table', { name: 'Products at or below their reorder level' })
    await within(low).findByText('Ball Bearing')
    expect(within(low).getByText('Shortfall')).toBeInTheDocument()
    expect(within(low).getAllByText(/^(90|12)$/)).toHaveLength(2) // 150-60 and 40-28
  })

  it('explains an empty replenishment list and disables its export', async () => {
    setup([])
    expect(await screen.findByText('Nothing is below its reorder level.')).toBeInTheDocument()
    const section = screen.getByRole('region', { name: 'Replenishment' })
    expect(within(section).getByRole('button', { name: /Export CSV/ })).toBeDisabled()
  })

  it('exports the replenishment list as CSV, neutralising spreadsheet formulas', async () => {
    setup()
    let blob: Blob | undefined
    const create = vi.fn((b: Blob) => ((blob = b), 'blob:fake'))
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const section = await screen.findByRole('region', { name: 'Replenishment' })
    await within(section).findByText('Ball Bearing')
    await userEvent.setup().click(within(section).getByRole('button', { name: /Export CSV/ }))

    await waitFor(() => expect(click).toHaveBeenCalled())
    const text = await blob!.text()
    expect(text.split('\n')[0]).toBe('SKU,Product,On hand,Reorder level,Shortfall,Status')
    expect(text).toContain('BR-2040,Ball Bearing,60,150,90,critical')
    expect(text).toContain("'=Contactor") // a leading "=" must not execute when opened in Excel
  })
})
