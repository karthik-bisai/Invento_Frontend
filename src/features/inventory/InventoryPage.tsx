import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Plus, RefreshCw, Search } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable, type SortState } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/AuthContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/cn'
import { int } from '@/lib/format'
import type { InventoryRow, InventorySortKey } from '@/types'
import { InventoryEditDrawer } from './InventoryEditDrawer'
import { useInventoryRows, useWarehouses } from './hooks'
import { KpiCards } from './KpiCards'
import { StockCreateDrawer, type StockPreset } from './StockCreateDrawer'
import { StockBadge } from './stock'
import { getStockStatus } from './stockStatus'

const PAGE_SIZE = 15

const columns: Column<InventoryRow>[] = [
  { key: 'sku', header: 'SKU', sortable: true, render: (r) => <span className="whitespace-nowrap font-mono text-xs">{r.sku}</span> },
  {
    key: 'name',
    header: 'Product',
    sortable: true,
    render: (r) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{r.product_name}</p>
        <p className="truncate text-xs text-fg-subtle">{r.category}</p>
      </div>
    ),
  },
  { key: 'warehouse', header: 'Warehouse', sortable: true, hideOnMobile: true, render: (r) => r.warehouse_name },
  { key: 'quantity_on_hand', header: 'On hand', sortable: true, align: 'right', numeric: true, render: (r) => int.format(r.quantity_on_hand) },
  { key: 'reserved_quantity', header: 'Reserved', sortable: true, align: 'right', numeric: true, hideOnMobile: true, render: (r) => int.format(r.reserved_quantity) },
  { key: 'available_quantity', header: 'Available', sortable: true, align: 'right', numeric: true, hideOnMobile: true, render: (r) => int.format(r.available_quantity) },
  {
    key: 'status',
    header: 'Status',
    render: (r) => (
      <span title={`${int.format(r.product_total_quantity)} total across warehouses · reorder at ${int.format(r.reorder_level)}`}>
        <StockBadge status={getStockStatus(r.product_total_quantity, r.reorder_level)} />
      </span>
    ),
  },
]

export function InventoryPage() {
  const [params, setParams] = useSearchParams()
  const { hasRole } = useAuth()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [warehouseId, setWarehouseId] = useState('')
  const [lowStock, setLowStock] = useState(params.get('low') === '1')
  const [sort, setSort] = useState<SortState | null>(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<InventoryRow | null>(null)
  // Arriving from a product or warehouse ("Add stock" there) opens the form with that one already chosen.
  const [adding, setAdding] = useState<StockPreset | null>(() => {
    const productId = params.get('addProduct') ?? undefined
    const warehouseId = params.get('addWarehouse') ?? undefined
    return productId || warehouseId ? { productId, warehouseId } : null
  })
  const [addKey, setAddKey] = useState(0)
  const closeAdd = () => {
    setAdding(null)
    const next = new URLSearchParams(params)
    next.delete('addProduct')
    next.delete('addWarehouse')
    setParams(next, { replace: true })
  }

  const q = useDebouncedValue(search.trim(), 300)
  const warehouses = useWarehouses()
  const rows = useInventoryRows({
    page,
    size: PAGE_SIZE,
    q,
    warehouseId,
    lowStock,
    sortBy: (sort?.key as InventorySortKey | undefined) ?? 'name',
    order: sort?.dir ?? 'asc',
  })

  // Any change to the result set sends you back to page 1.
  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }
  const filtersActive = !!(search || warehouseId || lowStock)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Inventory"
        description="Every product in every warehouse. Click a row to update counts."
        action={
          hasRole('ADMIN', 'INVENTORY_MANAGER') && (
            <Button
              variant="primary"
              onClick={() => {
                setAddKey((k) => k + 1)
                setAdding({})
              }}
            >
              <Plus className="size-3.5" aria-hidden />
              Add stock
            </Button>
          )
        }
      />
      <KpiCards onLowStockClick={() => resetPage(setLowStock)(true)} />

      <section className="flex flex-col gap-3" aria-label="Inventory">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1 sm:max-w-xs">
            <Input
              aria-label="Search products"
              placeholder="Search name or SKU…"
              leftIcon={<Search />}
              value={search}
              onChange={(e) => resetPage(setSearch)(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Select aria-label="Filter by warehouse" value={warehouseId} onChange={(e) => resetPage(setWarehouseId)(e.target.value)}>
              <option value="">All warehouses</option>
              {warehouses.data?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            aria-pressed={lowStock}
            onClick={() => resetPage(setLowStock)(!lowStock)}
            className={cn(lowStock && 'border-warn-ring bg-warn-bg text-warn-fg hover:bg-warn-bg')}
          >
            <AlertTriangle className="size-3.5" aria-hidden />
            Low stock only
          </Button>
          {filtersActive && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('')
                setWarehouseId('')
                setLowStock(false)
                setPage(1)
              }}
            >
              Clear
            </Button>
          )}
          <p className="ml-auto flex items-center gap-1.5 text-xs text-fg-subtle" aria-live="polite">
            <RefreshCw className={cn('size-3', rows.isFetching && 'animate-spin')} aria-hidden />
            {rows.isFetching ? 'Updating…' : 'Live · refreshes every 30s'}
          </p>
        </div>

        {rows.isError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
            <span>{getErrorMessage(rows.error, 'Couldn’t load inventory.')}</span>
            <Button size="sm" onClick={() => rows.refetch()}>
              Retry
            </Button>
          </div>
        )}

        <DataTable
          caption="Inventory by product and warehouse"
          columns={columns}
          data={rows.data?.items ?? []}
          rowKey={(r) => r.id}
          loading={rows.isLoading}
          sort={sort}
          onSortChange={resetPage(setSort)}
          onRowClick={setSelected}
          empty={filtersActive ? 'No inventory matches your filters.' : 'No inventory records yet.'}
        />

        {rows.data && (
          <Pagination page={page} size={PAGE_SIZE} total={rows.data.total} onPageChange={setPage} />
        )}
      </section>

      <InventoryEditDrawer key={selected?.id} row={selected} onClose={() => setSelected(null)} />
      <StockCreateDrawer key={`${addKey}-${adding?.productId ?? ''}-${adding?.warehouseId ?? ''}`} preset={adding} onClose={closeAdd} />
    </div>
  )
}
