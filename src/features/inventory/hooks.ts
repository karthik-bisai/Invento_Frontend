import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  InventoryItem,
  InventoryRow,
  InventorySortKey,
  InventorySummary,
  LowStockItem,
  Page,
  Product,
  Warehouse,
} from '@/types'

/** Poll interval for "live" data. The summary endpoint is Redis-cached for 60s and invalidated on every write. */
const LIVE_MS = 30_000

export function useInventorySummary() {
  return useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: async () => (await api.get<InventorySummary>('/inventory/summary')).data,
    refetchInterval: LIVE_MS,
  })
}

export function useLowStock(limit = 50) {
  return useQuery({
    queryKey: ['inventory', 'low-stock', limit],
    queryFn: async () => (await api.get<LowStockItem[]>('/inventory/low-stock', { params: { limit } })).data,
    refetchInterval: 60_000,
  })
}

export interface InventoryQuery {
  page: number
  size: number
  q?: string
  warehouseId?: string
  productId?: string
  lowStock?: boolean
  sortBy?: InventorySortKey
  order?: 'asc' | 'desc'
}

export function useInventoryRows(query: InventoryQuery) {
  return useQuery({
    queryKey: ['inventory', 'rows', query],
    queryFn: async () =>
      (
        await api.get<Page<InventoryRow>>('/inventory', {
          params: {
            page: query.page,
            size: query.size,
            q: query.q || undefined,
            warehouse_id: query.warehouseId || undefined,
            product_id: query.productId || undefined,
            low_stock: query.lowStock || undefined,
            sort_by: query.sortBy,
            order: query.order,
          },
        })
      ).data,
    placeholderData: keepPreviousData, // keep the old page visible while the next one loads
    refetchInterval: LIVE_MS,
  })
}

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses', 'all'],
    queryFn: async () => (await api.get<Page<Warehouse>>('/warehouses', { params: { size: 100 } })).data.items,
    staleTime: 5 * 60_000,
  })
}

/** Refetch inventory-derived data in the background; returning nothing means mutations don't wait for it. */
function useInvalidateInventory() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['inventory'] })
  }
}

export function useCreateStock() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: async (data: { product_id: string; warehouse_id: string; quantity_on_hand: number; reserved_quantity: number }) =>
      (await api.post<InventoryItem>('/inventory', data)).data,
    onSuccess: invalidate,
  })
}

export function useUpdateStock() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; quantity_on_hand: number; reserved_quantity: number }) =>
      (await api.patch<InventoryItem>(`/inventory/${id}`, body)).data,
    onSuccess: invalidate,
  })
}

export function useUpdateProduct() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Product, 'id'>> }) =>
      (await api.patch<Product>(`/products/${id}`, data)).data,
    onSuccess: invalidate,
  })
}

export function useSetReorderLevel() {
  const invalidate = useInvalidateInventory()
  return useMutation({
    mutationFn: async ({ productId, reorderLevel }: { productId: string; reorderLevel: number }) =>
      (await api.patch<Product>(`/products/${productId}/reorder-level`, { reorder_level: reorderLevel })).data,
    onSuccess: invalidate,
  })
}
