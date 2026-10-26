import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthContext'
import { int } from '@/lib/format'
import { useInventoryRows } from './hooks'

type Props = { productId: string; warehouseId?: never } | { warehouseId: string; productId?: never }

/**
 * Shows how products and warehouses relate. From a product: the warehouses holding it. From a warehouse:
 * the products it holds. Empty states point at the Add stock flow, which is where the link gets made.
 */
export function StockedList({ productId, warehouseId }: Props) {
  const { hasRole } = useAuth()
  const rows = useInventoryRows({ page: 1, size: 100, productId, warehouseId, sortBy: productId ? 'warehouse' : 'name', order: 'asc' })
  const items = rows.data?.items ?? []
  const forProduct = !!productId
  const addHref = forProduct ? `/inventory?addProduct=${productId}` : `/inventory?addWarehouse=${warehouseId}`
  const canAdd = hasRole('ADMIN', 'INVENTORY_MANAGER')

  return (
    <section aria-label={forProduct ? 'Stocked in' : 'Holds'} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold">{forProduct ? 'Stocked in' : 'Holds'}</h3>
        {canAdd && items.length > 0 && (
          <Link to={addHref}>
            <Button size="sm">
              <Plus className="size-3.5" aria-hidden />
              Add stock
            </Button>
          </Link>
        )}
      </div>

      {rows.isLoading ? (
        <div className="skeleton h-10 rounded-md" />
      ) : rows.isError ? (
        <p className="text-xs text-crit-fg">We couldn’t load the stock for this {forProduct ? 'product' : 'warehouse'}.</p>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-strong px-4 py-5 text-center">
          <p className="text-xs text-fg-muted">{forProduct ? 'This product isn’t stocked in any warehouse yet.' : 'Nothing is stored in this warehouse yet.'}</p>
          {canAdd && (
            <Link to={addHref} className="mt-3 inline-block">
              <Button size="sm" variant="primary">
                <Plus className="size-3.5" aria-hidden />
                Add stock
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{forProduct ? r.warehouse_name : r.product_name}</p>
                {!forProduct && <p className="font-mono text-xs text-fg-subtle">{r.sku}</p>}
              </div>
              <span className="num text-sm font-medium">{int.format(r.quantity_on_hand)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
