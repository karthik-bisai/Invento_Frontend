import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { int, money } from '@/lib/format'
import type { Warehouse, WarehouseSummary } from '@/types'
import { useInventorySummary } from '@/features/inventory/hooks'
import { useWarehouseList } from './hooks'
import { WarehouseDrawer, type WarehouseTarget } from './WarehouseDrawer'

const PAGE_SIZE = 15

export function WarehousesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<WarehouseTarget>(null)

  const q = useDebouncedValue(search.trim(), 300)
  const warehouses = useWarehouseList({ page, size: PAGE_SIZE, q })
  const summary = useInventorySummary()

  // Stock figures come from the cached summary, keyed by warehouse.
  const stats = new Map<string, WarehouseSummary>(summary.data?.warehouses.map((w) => [w.warehouse_id, w]))
  const stat = (w: Warehouse) => stats.get(w.id)

  const columns: Column<Warehouse>[] = [
    { key: 'name', header: 'Name', sortValue: (w) => w.name, render: (w) => <span className="font-medium">{w.name}</span> },
    { key: 'location', header: 'Location', sortValue: (w) => w.location, render: (w) => w.location },
    { key: 'on_hand', header: 'On hand', align: 'right', numeric: true, hideOnMobile: true, sortValue: (w) => stat(w)?.quantity_on_hand ?? 0, render: (w) => int.format(stat(w)?.quantity_on_hand ?? 0) },
    { key: 'reserved', header: 'Reserved', align: 'right', numeric: true, hideOnMobile: true, sortValue: (w) => stat(w)?.reserved_quantity ?? 0, render: (w) => int.format(stat(w)?.reserved_quantity ?? 0) },
    { key: 'value', header: 'Value', align: 'right', numeric: true, sortValue: (w) => Number(stat(w)?.total_value ?? 0), render: (w) => money.format(Number(stat(w)?.total_value ?? 0)) },
  ]

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <PageHeader
        title="Warehouses"
        description="Stocking locations and what each one holds."
        action={
          <Button variant="primary" onClick={() => setTarget('new')}>
            <Plus className="size-3.5" aria-hidden />
            New warehouse
          </Button>
        }
      />

      <div className="w-full sm:max-w-xs">
        <Input
          aria-label="Search warehouses"
          placeholder="Search name or location…"
          leftIcon={<Search />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {warehouses.isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
          <span>{getErrorMessage(warehouses.error, 'Couldn’t load warehouses.')}</span>
          <Button size="sm" onClick={() => warehouses.refetch()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable
        caption="Warehouses"
        columns={columns}
        data={warehouses.data?.items ?? []}
        rowKey={(w) => w.id}
        loading={warehouses.isLoading}
        onRowClick={setTarget}
        empty={q ? 'No warehouses match your search.' : 'No warehouses yet.'}
      />
      {warehouses.data && <Pagination page={page} size={PAGE_SIZE} total={warehouses.data.total} onPageChange={setPage} />}

      <WarehouseDrawer key={target === 'new' ? 'new' : (target?.id ?? 'closed')} target={target} onClose={() => setTarget(null)} />
    </div>
  )
}
