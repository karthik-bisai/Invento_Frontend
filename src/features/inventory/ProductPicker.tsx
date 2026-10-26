import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { Page, Product } from '@/types'

interface Props {
  value: Product | null
  onChange: (product: Product | null) => void
  error?: string
}

/** Search-as-you-type product chooser: works the same with ten products or ten thousand. */
export function ProductPicker({ value, onChange, error }: Props) {
  const [term, setTerm] = useState('')
  const q = useDebouncedValue(term.trim(), 250)
  const results = useQuery({
    queryKey: ['products', 'picker', q],
    queryFn: async () => (await api.get<Page<Product>>('/products', { params: { q: q || undefined, size: 8 } })).data.items,
    enabled: !value,
    placeholderData: keepPreviousData,
  })

  if (value) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-fg-muted">Product</span>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border-strong bg-surface-muted px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="font-mono text-xs text-fg-subtle">{value.sku}</p>
          </div>
          <Button size="sm" onClick={() => onChange(null)}>
            Change
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Input label="Product" placeholder="Search name or SKU…" leftIcon={<Search />} value={term} onChange={(e) => setTerm(e.target.value)} error={error} autoFocus />
      <ul aria-label="Matching products" className="max-h-52 divide-y divide-border overflow-y-auto rounded-md border border-border">
        {(results.data ?? []).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onChange(p)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-hover"
            >
              <span className="min-w-0 truncate text-sm">{p.name}</span>
              <span className="shrink-0 font-mono text-xs text-fg-subtle">{p.sku}</span>
            </button>
          </li>
        ))}
        {results.data?.length === 0 && <li className="px-3 py-4 text-center text-xs text-fg-muted">No products match “{term}”.</li>}
        {results.isLoading && <li className="skeleton m-2 h-6 rounded" />}
      </ul>
    </div>
  )
}
