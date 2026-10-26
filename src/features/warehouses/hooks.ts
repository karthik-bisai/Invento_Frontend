import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Page, Warehouse } from '@/types'

export type WarehouseInput = Omit<Warehouse, 'id'>

export function useWarehouseList(query: { page: number; size: number; q?: string }) {
  return useQuery({
    queryKey: ['warehouses', 'list', query],
    queryFn: async () =>
      (await api.get<Page<Warehouse>>('/warehouses', { params: { page: query.page, size: query.size, q: query.q || undefined } })).data,
    placeholderData: keepPreviousData,
  })
}

/** Warehouse changes alter the inventory filter list, stock rows and the summary breakdown. */
function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['warehouses'] })
    void qc.invalidateQueries({ queryKey: ['inventory'] })
  }
}

export function useCreateWarehouse() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (data: WarehouseInput) => (await api.post<Warehouse>('/warehouses', data)).data,
    onSuccess: invalidate,
  })
}

export function useEditWarehouse() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WarehouseInput> }) =>
      (await api.patch<Warehouse>(`/warehouses/${id}`, data)).data,
    onSuccess: invalidate,
  })
}

export function useDeleteWarehouse() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/warehouses/${id}`)
    },
    onSuccess: invalidate,
  })
}
