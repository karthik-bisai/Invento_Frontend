import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import { useAuth } from '@/features/auth/AuthContext'
import { DEFAULT_PREFERENCES, type DeviceSession, type Preferences, type User } from '@/types'

export interface ProfileInput {
  full_name: string
  job_title: string
  phone: string
}

export function useUpdateProfile() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: async (data: ProfileInput) => (await api.patch<User>('/auth/me', data)).data,
    onSuccess: setUser,
  })
}

export function useUploadAvatar() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return (await api.post<User>('/auth/me/avatar', form)).data
    },
    onSuccess: setUser,
  })
}

export function useRemoveAvatar() {
  const { setUser } = useAuth()
  return useMutation({
    mutationFn: async () => (await api.delete<User>('/auth/me/avatar')).data,
    onSuccess: setUser,
  })
}

/** Saves instantly and optimistically, so a toggle never feels laggy. Rolls back if the server refuses. */
export function useUpdatePreferences() {
  const { user, setUser } = useAuth()
  return useMutation({
    mutationFn: async (patch: Partial<Preferences>) => (await api.patch<User>('/auth/me/preferences', patch)).data,
    onMutate: (patch) => {
      const previous = user
      if (user) setUser({ ...user, preferences: { ...DEFAULT_PREFERENCES, ...user.preferences, ...patch } })
      return { previous }
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) setUser(ctx.previous)
    },
    onSuccess: setUser,
  })
}

export function useChangePassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      await api.post('/auth/me/password', data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }), // every other device was just signed out
  })
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get<{ items: DeviceSession[] }>('/auth/sessions')).data.items,
  })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/auth/sessions/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => (await api.post<{ ended: number }>('/auth/sessions/revoke-others')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => (await api.get<import('@/types').Organization>('/organizations/me')).data,
  })
}

export function useUpdateOrganization() {
  const qc = useQueryClient()
  const { user, setUser } = useAuth()
  return useMutation({
    mutationFn: async (data: Partial<import('@/types').Organization>) =>
      (await api.patch<import('@/types').Organization>('/organizations/me', data)).data,
    onSuccess: (updatedOrg) => {
      qc.invalidateQueries({ queryKey: ['organization'] })
      if (user && updatedOrg.currency) {
        setUser({ ...user, organization_currency: updatedOrg.currency })
      }
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })
}

