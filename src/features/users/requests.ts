import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { AccessRequest, Page, RequestStatus, Role } from '@/types'

export type RequestFilter = RequestStatus | 'ALL'

export function useAccessRequests(query: { status: RequestFilter; page: number; size: number }) {
  return useQuery({
    queryKey: ['access-requests', query],
    queryFn: async () =>
      (
        await api.get<Page<AccessRequest>>('/access-requests', {
          params: { page: query.page, size: query.size, status: query.status === 'ALL' ? undefined : query.status },
        })
      ).data,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
}

/** Deciding a request changes the people list, the admin's bell and the request lists themselves. */
function useRefreshAfterDecision() {
  const qc = useQueryClient()
  return () => {
    for (const key of ['access-requests', 'users', 'notifications']) void qc.invalidateQueries({ queryKey: [key] })
  }
}

export function useApproveRequest() {
  const refresh = useRefreshAfterDecision()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) =>
      (await api.post<AccessRequest>(`/access-requests/${id}/approve`, { role })).data,
    onSuccess: refresh,
  })
}

export function useRejectRequest() {
  const refresh = useRefreshAfterDecision()
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) =>
      (await api.post<AccessRequest>(`/access-requests/${id}/reject`, { note: note.trim() || null })).data,
    onSuccess: refresh,
  })
}
