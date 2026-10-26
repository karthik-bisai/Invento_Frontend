import { useNavigate } from 'react-router-dom'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { int, money } from '@/lib/format'
import type { LowStockItem, WarehouseSummary } from '@/types'
import { useInventorySummary, useLowStock } from './hooks'
import { KpiCards } from './KpiCards'
import { StockBadge } from './stock'

const lowStockColumns: Column<LowStockItem>[] = [
  { key: 'sku', header: 'SKU', sortValue: (r) => r.sku, render: (r) => <span className="whitespace-nowrap font-mono text-xs">{r.sku}</span> },
  { key: 'name', header: 'Product', sortValue: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'qty', header: 'On hand', align: 'right', numeric: true, sortValue: (r) => r.quantity_on_hand, render: (r) => int.format(r.quantity_on_hand) },
  { key: 'reorder', header: 'Reorder at', align: 'right', numeric: true, hideOnMobile: true, sortValue: (r) => r.reorder_level, render: (r) => int.format(r.reorder_level) },
  { key: 'status', header: 'Status', sortValue: (r) => (r.status === 'critical' ? 0 : 1), render: (r) => <StockBadge status={r.status} /> },
]

const warehouseColumns: Column<WarehouseSummary>[] = [
  { key: 'name', header: 'Warehouse', sortValue: (r) => r.name, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'qty', header: 'On hand', align: 'right', numeric: true, sortValue: (r) => r.quantity_on_hand, render: (r) => int.format(r.quantity_on_hand) },
  { key: 'reserved', header: 'Reserved', align: 'right', numeric: true, hideOnMobile: true, sortValue: (r) => r.reserved_quantity, render: (r) => int.format(r.reserved_quantity) },
  { key: 'value', header: 'Value', align: 'right', numeric: true, sortValue: (r) => Number(r.total_value), render: (r) => money.format(Number(r.total_value)) },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const summary = useInventorySummary()
  const lowStock = useLowStock()

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title="Overview" description="Where stock stands across every warehouse right now." />
      <KpiCards onLowStockClick={() => navigate('/inventory?low=1')} />

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="flex flex-col gap-3 xl:col-span-3">
          <h2 className="font-display text-2xl">Needs reordering</h2>
          <DataTable
            caption="Products at or below their reorder level"
            columns={lowStockColumns}
            data={lowStock.data ?? []}
            rowKey={(r) => r.product_id}
            loading={lowStock.isLoading}
            onRowClick={(r) => navigate(`/inventory?q=${encodeURIComponent(r.sku)}`)}
            empty="Nothing to reorder. All products are above their reorder levels."
          />
        </section>
        <section className="flex flex-col gap-3 xl:col-span-2">
          <h2 className="font-display text-2xl">By warehouse</h2>
          <DataTable
            caption="Stock by warehouse"
            columns={warehouseColumns}
            data={summary.data?.warehouses ?? []}
            rowKey={(r) => r.warehouse_id}
            loading={summary.isLoading}
            empty="No warehouses yet."
          />
        </section>
      </div>
    </div>
  )
}
