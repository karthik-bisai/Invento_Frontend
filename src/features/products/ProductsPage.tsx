import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { useAuth } from '@/features/auth/AuthContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { int, money } from '@/lib/format'
import type { Product } from '@/types'
import { useProducts } from './hooks'
import { ProductDrawer, type ProductTarget } from './ProductDrawer'

const PAGE_SIZE = 15

const columns: Column<Product>[] = [
  { key: 'sku', header: 'SKU', sortValue: (p) => p.sku, render: (p) => <span className="whitespace-nowrap font-mono text-xs">{p.sku}</span> },
  { key: 'name', header: 'Name', sortValue: (p) => p.name, render: (p) => <span className="font-medium">{p.name}</span> },
  { key: 'category', header: 'Category', sortValue: (p) => p.category, hideOnMobile: true, render: (p) => p.category },
  { key: 'unit_price', header: 'Unit price', sortValue: (p) => Number(p.unit_price), align: 'right', numeric: true, render: (p) => money.format(Number(p.unit_price)) },
  { key: 'reorder_level', header: 'Reorder at', sortValue: (p) => p.reorder_level, align: 'right', numeric: true, hideOnMobile: true, render: (p) => int.format(p.reorder_level) },
]

export function ProductsPage() {
  const { hasRole } = useAuth()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<ProductTarget>(null)

  const q = useDebouncedValue(search.trim(), 300)
  const products = useProducts({ page, size: PAGE_SIZE, q })

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <PageHeader
        title="Products"
        description="The catalogue of items you stock. Quantities live under Inventory."
        action={
          hasRole('ADMIN', 'INVENTORY_MANAGER') && (
            <Button variant="primary" onClick={() => setTarget('new')}>
              <Plus className="size-3.5" aria-hidden />
              New product
            </Button>
          )
        }
      />

      <div className="w-full sm:max-w-xs">
        <Input
          aria-label="Search products"
          placeholder="Search name or SKU…"
          leftIcon={<Search />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {products.isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
          <span>{getErrorMessage(products.error, 'Couldn’t load products.')}</span>
          <Button size="sm" onClick={() => products.refetch()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable
        caption="Products"
        columns={columns}
        data={products.data?.items ?? []}
        rowKey={(p) => p.id}
        loading={products.isLoading}
        onRowClick={setTarget}
        empty={q ? 'No products match your search.' : 'No products yet.'}
      />
      {products.data && <Pagination page={page} size={PAGE_SIZE} total={products.data.total} onPageChange={setPage} />}

      <ProductDrawer key={target === 'new' ? 'new' : (target?.id ?? 'closed')} target={target} onClose={() => setTarget(null)} />
    </div>
  )
}
