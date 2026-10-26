import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { StockStatus } from './stockStatus'

const META: Record<StockStatus, { label: string; variant: BadgeVariant }> = {
  in_stock: { label: 'In Stock', variant: 'success' },
  low: { label: 'Low Stock', variant: 'warning' },
  critical: { label: 'Critical', variant: 'danger' },
}

export function StockBadge({ status }: { status: StockStatus }) {
  const { label, variant } = META[status]
  return <Badge variant={variant}>{label}</Badge>
}
