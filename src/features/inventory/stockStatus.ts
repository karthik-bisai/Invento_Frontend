export type StockStatus = 'in_stock' | 'low' | 'critical'

/** Same rule as the backend (services/inventory_summary.py): critical at <= half the reorder level. */
export function getStockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (reorderLevel <= 0) return 'in_stock' // no threshold configured
  if (quantity * 2 <= reorderLevel) return 'critical'
  if (quantity <= reorderLevel) return 'low'
  return 'in_stock'
}
