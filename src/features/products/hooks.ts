import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Page, Product } from '@/types'

export type ProductInput = Omit<Product, 'id'>

export function useProducts(query: { page: number; size: number; q?: string }) {
  return useQuery({
    queryKey: ['products', 'list', query],
    queryFn: async () =>
      (await api.get<Page<Product>>('/products', { params: { page: query.page, size: query.size, q: query.q || undefined } })).data,
    placeholderData: keepPreviousData,
  })
}

/** Product changes ripple into stock rows, KPIs and low-stock alerts, so refresh both families in the background. */
function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['products'] })
    void qc.invalidateQueries({ queryKey: ['inventory'] })
  }
}

export function useCreateProduct() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (data: ProductInput) => (await api.post<Product>('/products', data)).data,
    onSuccess: invalidate,
  })
}

export function useEditProduct() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductInput> }) =>
      (await api.patch<Product>(`/products/${id}`, data)).data,
    onSuccess: invalidate,
  })
}

export function useReorderLevel() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, reorderLevel }: { id: string; reorderLevel: number }) =>
      (await api.patch<Product>(`/products/${id}/reorder-level`, { reorder_level: reorderLevel })).data,
    onSuccess: invalidate,
  })
}

export function useDeleteProduct() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`)
    },
    onSuccess: invalidate,
  })
}
