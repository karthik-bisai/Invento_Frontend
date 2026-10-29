import { useEffect, useState } from 'react'
import { StockBadge } from '@/features/inventory/stock'
import { getStockStatus } from '@/features/inventory/stockStatus'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'
import { int } from '@/lib/format'

interface Row {
  sku: string
  name: string
  start: number
  reorder: number
}

const ROWS: Row[] = [
  { sku: 'BR-2040', name: 'Ball bearing 6204-2RS', start: 412, reorder: 150 },
  { sku: 'EL-3100', name: 'Contactor 24V 3-pole', start: 96, reorder: 40 },
  { sku: 'PK-9001', name: 'Corrugated box 40 cm', start: 1480, reorder: 1000 },
  { sku: 'FS-1180', name: 'Hex bolt M8 × 40', start: 260, reorder: 200 },
  { sku: 'HY-5520', name: 'Hydraulic hose 1/2 in', start: 58, reorder: 40 },
]

const bar = { in_stock: 'bg-ok-fg', low: 'bg-warn-fg', critical: 'bg-crit-fg' } as const

/**
 * Decorative, self-running preview of the product: stock drains, rows turn
 * Low then Critical, and a reorder lands. Static under reduced motion.
 */
export function LedgerDemo({ className }: { className?: string }) {
  const reduced = useReducedMotion()
  const [qty, setQty] = useState(() => ROWS.map((r) => r.start))
  const [lastChanged, setLastChanged] = useState<number | null>(null)

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      const i = Math.floor(Math.random() * ROWS.length)
      setQty((prev) => {
        const next = [...prev]
        const row = ROWS[i]
        // A critical row gets restocked on its next tick, so the loop never settles.
        next[i] = getStockStatus(prev[i], row.reorder) === 'critical' ? row.start : Math.max(prev[i] - Math.ceil(row.reorder * (0.12 + Math.random() * 0.2)), 0)
        return next
      })
      setLastChanged(i)
    }, 1700)
    return () => window.clearInterval(id)
  }, [reduced])

  return (
    <div aria-hidden className={cn('w-full max-w-md lg:max-w-lg rounded-xl border border-border bg-surface p-2 sm:p-3 shadow-pop', className)}>
      <div className="flex items-center justify-between px-3 pb-2 pt-2.5">
        <p className="text-sm font-medium">Main warehouse</p>
        <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <span className="size-1.5 rounded-full bg-accent" style={{ animation: reduced ? undefined : 'pulse-ring 1.8s ease-out infinite' }} />
          Live
        </span>
      </div>
      <ul>
        {ROWS.map((row, i) => {
          const status = getStockStatus(qty[i], row.reorder)
          const pct = Math.min((qty[i] / (row.reorder * 3)) * 100, 100)
          return (
            <li key={row.sku} className="rounded-lg px-3 py-2.5 transition-colors duration-500" style={{ background: lastChanged === i ? 'var(--surface-muted)' : undefined }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  <p className="font-mono text-[0.6875rem] text-fg-subtle">{row.sku}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span key={qty[i]} className={cn('num text-sm', !reduced && 'animate-pop')}>
                    {int.format(qty[i])}
                  </span>
                  <span className="hidden w-24 justify-end sm:flex">
                    <StockBadge status={status} />
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-muted">
                <div className={cn('h-full rounded-full transition-[width,background-color] duration-700 ease-out', bar[status])} style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
