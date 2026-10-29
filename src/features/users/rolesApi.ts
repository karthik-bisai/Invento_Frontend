import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type {
  OrganizationRole,
  PermissionCatalogItem,
  RoleCreateInput,
  RoleUpdateInput,
} from '@/types'

export const ROLES_KEY = ['roles']
export const CATALOG_KEY = ['permission-catalog']

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: async () => (await api.get<OrganizationRole[]>('/roles')).data,
    staleTime: 60_000,
  })
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: CATALOG_KEY,
    queryFn: async () => (await api.get<PermissionCatalogItem[]>('/roles/permissions-catalog')).data,
    staleTime: 5 * 60_000,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: RoleCreateInput) =>
      (await api.post<OrganizationRole>('/roles', data)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ROLES_KEY })
    },
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoleUpdateInput }) =>
      (await api.patch<OrganizationRole>(`/roles/${id}`, data)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ROLES_KEY })
      void qc.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/roles/${id}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ROLES_KEY })
    },
  })
}
