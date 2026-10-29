import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { AppNotification } from '@/types'

interface NotificationPage {
  items: AppNotification[]
  unread: number
}

const KEY = ['notifications']

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: [...KEY, { unreadOnly }],
    queryFn: async () =>
      (await api.get<NotificationPage>('/notifications', { params: unreadOnly ? { unread: true } : {} })).data,
    refetchInterval: 30_000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useClearNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/clear`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
