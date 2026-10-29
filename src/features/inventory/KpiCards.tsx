import type { CSSProperties, ReactNode } from 'react'
import { AlertTriangle, Boxes, Package, type LucideIcon } from 'lucide-react'
import { CountUp } from '@/components/ui/CountUp'
import { CurrencyIcon } from '@/components/ui/CurrencyIcon'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'
import { getAppCurrency } from '@/lib/currency'
import { int, money } from '@/lib/format'
import { useInventorySummary } from './hooks'

interface KpiProps {
  label: string
  value: number
  format: (n: number) => string
  icon?: LucideIcon
  iconElement?: ReactNode
  loading: boolean
  index: number
  tone?: 'default' | 'alert'
  onClick?: () => void
  hint?: string
}

function Kpi({ label, value, format, icon: Icon, iconElement, loading, index, tone = 'default', onClick, hint }: KpiProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={hint}
      style={{ '--d': index * 70 } as CSSProperties}
      className={cn(
        'animate-rise rounded-lg border border-border bg-surface p-5 text-left',
        onClick && 'cursor-pointer transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        {iconElement ? (
          <span className={cn('flex items-center justify-center', tone === 'alert' ? 'text-warn-fg' : 'text-fg-subtle')}>
            {iconElement}
          </span>
        ) : Icon ? (
          <Icon className={cn('size-4', tone === 'alert' ? 'text-warn-fg' : 'text-fg-subtle')} aria-hidden />
        ) : null}
      </div>
      {loading ? (
        <div className="skeleton mt-3 h-9 w-28 rounded" />
      ) : (
        <p className={cn('font-display num mt-2 text-5xl leading-none', tone === 'alert' && 'text-warn-fg')}>
          <CountUp value={value} format={format} />
        </p>
      )}
    </Tag>
  )
}

/** Summary KPIs from GET /inventory/summary (Redis-cached for 60s server-side, invalidated on writes). */
export function KpiCards({ onLowStockClick }: { onLowStockClick?: () => void }) {
  const { data: s, isLoading, isError } = useInventorySummary()
  const { user } = useAuth()
  const currencyCode = user?.organization_currency || getAppCurrency()

  return (
    <section aria-label="Key figures" className="flex flex-col gap-3">
      {isError && (
        <p role="alert" className="rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
          Couldn’t load the summary. Figures below may be out of date.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total stock" value={s?.total_quantity_on_hand ?? 0} format={(n) => int.format(Math.round(n))} icon={Boxes} loading={isLoading} index={0} />
        <Kpi
          label="Low stock alerts"
          value={s?.low_stock_products ?? 0}
          format={(n) => int.format(Math.round(n))}
          icon={AlertTriangle}
          loading={isLoading}
          index={1}
          tone={s && s.low_stock_products > 0 ? 'alert' : 'default'}
          onClick={onLowStockClick}
          hint={onLowStockClick ? 'Show products below their reorder level' : undefined}
        />
        <Kpi label="Total SKUs" value={s?.total_products ?? 0} format={(n) => int.format(Math.round(n))} icon={Package} loading={isLoading} index={2} />
        <Kpi
          label="Inventory value"
          value={Number(s?.total_value ?? 0)}
          format={(n) => money.format(n, currencyCode)}
          iconElement={<CurrencyIcon currency={currencyCode} className="size-4" />}
          loading={isLoading}
          index={3}
        />
      </div>
    </section>
  )
}
