import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Page, Role, User } from '@/types'

export function useUsers(query: { page: number; size: number; q?: string }) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: async () =>
      (await api.get<Page<User>>('/auth/users', { params: { page: query.page, size: query.size, q: query.q || undefined } })).data,
    placeholderData: keepPreviousData,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['users'] })
  }
}

export function useCreateUser() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (data: {
      email: string
      password: string
      role: Role
      full_name?: string
      job_title?: string
      department?: string
    }) => (await api.post<User>('/auth/users', data)).data,
    onSuccess: invalidate,
  })
}

export function useUpdateUser() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: {
        full_name?: string
        job_title?: string
        department?: string
        role?: Role
        is_active?: boolean
        password?: string
      }
    }) => (await api.patch<User>(`/auth/users/${id}`, data)).data,
    onSuccess: invalidate,
  })
}
