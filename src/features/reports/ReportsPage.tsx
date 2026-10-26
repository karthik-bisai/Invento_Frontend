import { Download } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { useInventorySummary, useLowStock } from '@/features/inventory/hooks'
import { KpiCards } from '@/features/inventory/KpiCards'
import { StockBadge } from '@/features/inventory/stock'
import { downloadCsv, toCsv } from '@/lib/csv'
import { int, money } from '@/lib/format'
import type { LowStockItem, WarehouseSummary } from '@/types'

const warehouseColumns = (totalValue: number): Column<WarehouseSummary>[] => [
  { key: 'name', header: 'Warehouse', sortValue: (w) => w.name, render: (w) => <span className="font-medium">{w.name}</span> },
  { key: 'on_hand', header: 'On hand', align: 'right', numeric: true, sortValue: (w) => w.quantity_on_hand, render: (w) => int.format(w.quantity_on_hand) },
  { key: 'reserved', header: 'Reserved', align: 'right', numeric: true, hideOnMobile: true, sortValue: (w) => w.reserved_quantity, render: (w) => int.format(w.reserved_quantity) },
  { key: 'value', header: 'Value', align: 'right', numeric: true, sortValue: (w) => Number(w.total_value), render: (w) => money.format(Number(w.total_value)) },
  {
    key: 'share',
    header: 'Share of value',
    hideOnMobile: true,
    sortValue: (w) => Number(w.total_value),
    render: (w) => {
      const pct = totalValue > 0 ? (Number(w.total_value) / totalValue) * 100 : 0
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <span className="num w-10 text-xs text-fg-muted">{pct.toFixed(0)}%</span>
        </div>
      )
    },
  },
]

const lowStockColumns: Column<LowStockItem>[] = [
  { key: 'sku', header: 'SKU', sortValue: (i) => i.sku, render: (i) => <span className="whitespace-nowrap font-mono text-xs">{i.sku}</span> },
  { key: 'name', header: 'Product', sortValue: (i) => i.name, render: (i) => <span className="font-medium">{i.name}</span> },
  { key: 'qty', header: 'On hand', align: 'right', numeric: true, sortValue: (i) => i.quantity_on_hand, render: (i) => int.format(i.quantity_on_hand) },
  { key: 'reorder', header: 'Reorder at', align: 'right', numeric: true, sortValue: (i) => i.reorder_level, render: (i) => int.format(i.reorder_level) },
  { key: 'short', header: 'Shortfall', align: 'right', numeric: true, sortValue: (i) => i.reorder_level - i.quantity_on_hand, render: (i) => int.format(Math.max(i.reorder_level - i.quantity_on_hand, 0)) },
  { key: 'status', header: 'Status', sortValue: (i) => i.status, render: (i) => <StockBadge status={i.status} /> },
]

function ExportButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button size="sm" onClick={onClick} disabled={disabled}>
      <Download className="size-3.5" aria-hidden />
      Export CSV
    </Button>
  )
}

function SectionError({ error, onRetry, fallback }: { error: unknown; onRetry: () => void; fallback: string }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
      <span>{getErrorMessage(error, fallback)}</span>
      <Button size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

export function ReportsPage() {
  const summary = useInventorySummary()
  const lowStock = useLowStock(100)
  const warehouses = summary.data?.warehouses ?? []
  const lowItems = lowStock.data ?? []

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader title="Reports" description="Stock position and replenishment needs. Figures refresh automatically." />

      <KpiCards />

      <section className="flex flex-col gap-3" aria-label="Stock by warehouse">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Stock by warehouse</h2>
          <ExportButton
            disabled={warehouses.length === 0}
            onClick={() =>
              downloadCsv(
                'stock-by-warehouse.csv',
                toCsv(
                  ['Warehouse', 'On hand', 'Reserved', 'Value (USD)'],
                  warehouses.map((w) => [w.name, w.quantity_on_hand, w.reserved_quantity, w.total_value]),
                ),
              )
            }
          />
        </div>
        {summary.isError && <SectionError error={summary.error} onRetry={() => summary.refetch()} fallback="Couldn’t load the warehouse breakdown." />}
        <DataTable
          caption="Stock by warehouse"
          columns={warehouseColumns(Number(summary.data?.total_value ?? 0))}
          data={warehouses}
          rowKey={(w) => w.warehouse_id}
          loading={summary.isLoading}
          empty="No warehouses yet."
        />
      </section>

      <section className="flex flex-col gap-3" aria-label="Replenishment">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Needs replenishment</h2>
          <ExportButton
            disabled={lowItems.length === 0}
            onClick={() =>
              downloadCsv(
                'low-stock.csv',
                toCsv(
                  ['SKU', 'Product', 'On hand', 'Reorder level', 'Shortfall', 'Status'],
                  lowItems.map((i) => [i.sku, i.name, i.quantity_on_hand, i.reorder_level, Math.max(i.reorder_level - i.quantity_on_hand, 0), i.status]),
                ),
              )
            }
          />
        </div>
        {lowStock.isError && <SectionError error={lowStock.error} onRetry={() => lowStock.refetch()} fallback="Couldn’t load low-stock items." />}
        <DataTable
          caption="Products at or below their reorder level"
          columns={lowStockColumns}
          data={lowItems}
          rowKey={(i) => i.product_id}
          loading={lowStock.isLoading}
          empty="Nothing is below its reorder level."
        />
      </section>
    </div>
  )
}
