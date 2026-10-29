import { useState } from 'react'
import { Shield, Users, Lock, Trash2, Edit3, Plus, AlertCircle } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { OrganizationRole } from '@/types'
import { RoleDrawer, type RoleTarget } from './RoleDrawer'
import { useDeleteRole, useRoles } from './rolesApi'

export function RolesManagement() {
  const rolesQuery = useRoles()
  const deleteMutation = useDeleteRole()

  const [activeDrawerRole, setActiveDrawerRole] = useState<RoleTarget>(null)
  const [deletingRole, setDeletingRole] = useState<OrganizationRole | null>(null)
  const [deleteError, setDeleteError] = useState<string>()

  const roles = rolesQuery.data ?? []

  function getModuleSummary(permissions: string[]): { module: string; count: number }[] {
    const counts: Record<string, number> = {}
    for (const p of permissions) {
      const [mod] = p.split(':')
      if (mod) counts[mod] = (counts[mod] || 0) + 1
    }
    return Object.entries(counts).map(([module, count]) => ({ module, count }))
  }

  async function confirmDelete() {
    if (!deletingRole) return
    setDeleteError(undefined)
    try {
      await deleteMutation.mutateAsync(deletingRole.id)
      setDeletingRole(null)
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Failed to delete role.'))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-fg">Configured Organization Roles</h2>
          <p className="text-xs text-fg-muted">
            Manage roles and customize granular permissions for each role in your organization.
          </p>
        </div>
        <Button variant="primary" onClick={() => setActiveDrawerRole('new')}>
          <Plus className="size-3.5" aria-hidden />
          New role
        </Button>
      </div>

      {rolesQuery.isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
          <span>{getErrorMessage(rolesQuery.error, 'Could not load organization roles.')}</span>
          <Button size="sm" onClick={() => void rolesQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {rolesQuery.isLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-fg-muted">
          Loading configured roles…
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {roles.map((r) => {
          const moduleSummary = getModuleSummary(r.permissions)
          const canDelete = !r.is_system && r.user_count === 0

          return (
            <div
              key={r.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:border-border-strong hover:shadow"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-surface-muted text-accent">
                      <Shield className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-fg text-base leading-tight">{r.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        {r.is_system ? (
                          <Badge variant="info" className="text-[11px] py-0">
                            <Lock className="mr-1 size-2.5" /> System Role
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[11px] py-0">
                            Custom Role
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-xs text-fg-muted">
                          <Users className="size-3" />
                          <span>
                            {r.user_count} {r.user_count === 1 ? 'user' : 'users'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveDrawerRole(r)}
                      aria-label={`Configure permissions for ${r.name}`}
                    >
                      <Edit3 className="size-3.5" />
                      Configure
                    </Button>
                    {!r.is_system && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-crit-fg hover:bg-crit-bg/40"
                        disabled={!canDelete}
                        title={
                          r.user_count > 0
                            ? `Cannot delete role with ${r.user_count} assigned user(s)`
                            : 'Delete this custom role'
                        }
                        onClick={() => setDeletingRole(r)}
                        aria-label={`Delete ${r.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-fg-muted line-clamp-2">
                  {r.description || 'No description provided for this role.'}
                </p>

                <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-3">
                  <span className="text-[11px] font-medium text-fg-subtle uppercase tracking-wider">
                    Permissions ({r.permissions.length} total)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {moduleSummary.map(({ module, count }) => (
                      <span
                        key={module}
                        className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-xs text-fg capitalize"
                      >
                        {module} <span className="ml-1 text-[11px] text-fg-subtle">({count})</span>
                      </span>
                    ))}
                    {r.permissions.length === 0 && (
                      <span className="text-xs italic text-fg-subtle">No permissions granted</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deletingRole)}
        onClose={() => {
          setDeletingRole(null)
          setDeleteError(undefined)
        }}
        title={`Delete Role “${deletingRole?.name}”?`}
        description="This will permanently delete this custom role from your organization. This action cannot be undone."
        size="sm"
        footer={
          <>
            <Button
              onClick={() => {
                setDeletingRole(null)
                setDeleteError(undefined)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => void confirmDelete()}
            >
              Delete role
            </Button>
          </>
        }
      >
        {deleteError && (
          <div role="alert" className="mt-2 flex items-center gap-2 rounded-md border border-crit-ring bg-crit-bg p-2.5 text-xs text-crit-fg">
            <AlertCircle className="size-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}
      </Modal>

      {/* Role Config Drawer */}
      <RoleDrawer
        key={activeDrawerRole === 'new' ? 'new' : activeDrawerRole?.id ?? 'closed'}
        target={activeDrawerRole}
        onClose={() => setActiveDrawerRole(null)}
      />
    </div>
  )
}
