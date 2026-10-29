import { useState, useMemo } from 'react'
import { Shield, Lock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import type { OrganizationRole, PermissionCatalogItem } from '@/types'
import { useCreateRole, usePermissionCatalog, useUpdateRole } from './rolesApi'

export type RoleTarget = OrganizationRole | 'new' | null

interface Props {
  target: RoleTarget
  onClose: () => void
}

export function RoleDrawer({ target, onClose }: Props) {
  const role = target && target !== 'new' ? target : null
  const creating = target === 'new'

  const catalogQuery = usePermissionCatalog()
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()

  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions ?? [])
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const catalog = catalogQuery.data ?? []

  const isAdminSystemRole = Boolean(role?.is_system && role?.name.toLowerCase() === 'admin')

  // Validation
  const nameTrimmed = name.trim()
  const nameError = creating && !nameTrimmed
    ? 'Role name is required.'
    : nameTrimmed.length > 0 && nameTrimmed.length < 2
      ? 'Role name must be at least 2 characters.'
      : undefined

  const dirty =
    creating ||
    nameTrimmed !== (role?.name ?? '') ||
    description.trim() !== (role?.description ?? '') ||
    JSON.stringify([...selectedPermissions].sort()) !== JSON.stringify([...(role?.permissions ?? [])].sort())

  const invalid = Boolean(nameError) || nameTrimmed.length < 2

  function isActionChecked(module: string, action: string): boolean {
    const permKey = `${module}:${action}`
    if (isAdminSystemRole && (permKey === 'roles:view' || permKey === 'roles:edit')) {
      return true
    }
    return selectedPermissions.includes(permKey)
  }

  function togglePermission(module: string, action: string, checked: boolean) {
    const permKey = `${module}:${action}`
    if (isAdminSystemRole && (permKey === 'roles:view' || permKey === 'roles:edit')) {
      return // Protected system admin permissions
    }

    let next = new Set(selectedPermissions)

    if (checked) {
      next.add(permKey)
      // Enabling create/edit/delete/approve requires view permission
      if (action !== 'view') {
        next.add(`${module}:view`)
      }
    } else {
      next.delete(permKey)
      // Disabling view removes all actions for this module
      if (action === 'view') {
        for (const item of catalog) {
          if (item.module === module) {
            for (const act of item.actions) {
              const key = `${module}:${act.action}`
              if (!(isAdminSystemRole && (key === 'roles:view' || key === 'roles:edit'))) {
                next.delete(key)
              }
            }
          }
        }
      }
    }

    setSelectedPermissions(Array.from(next))
  }

  function toggleAllForModule(item: PermissionCatalogItem, enable: boolean) {
    let next = new Set(selectedPermissions)
    for (const act of item.actions) {
      const key = `${item.module}:${act.action}`
      if (enable) {
        next.add(key)
      } else {
        if (!(isAdminSystemRole && (key === 'roles:view' || key === 'roles:edit'))) {
          next.delete(key)
        }
      }
    }
    setSelectedPermissions(Array.from(next))
  }

  async function handleSave() {
    setSaving(true)
    setError(undefined)

    try {
      if (creating) {
        await createMutation.mutateAsync({
          name: nameTrimmed,
          description: description.trim() || undefined,
          permissions: selectedPermissions,
        })
        setSuccess(true)
      } else if (role) {
        await updateMutation.mutateAsync({
          id: role.id,
          data: {
            ...(!role.is_system && nameTrimmed !== role.name && { name: nameTrimmed }),
            description: description.trim() || undefined,
            permissions: selectedPermissions,
          },
        })
        onClose()
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save role permissions.'))
    } finally {
      setSaving(false)
    }
  }

  if (!target) {
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    )
  }

  if (success) {
    return (
      <Drawer open onClose={onClose} title="Role Created Successfully" size="lg">
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-ok-bg text-ok-fg">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-fg">Role Created</h2>
          <p className="mt-2 text-sm text-fg-muted">
            The role <span className="font-semibold text-fg">“{nameTrimmed}”</span> is now available to assign to employees in your organization.
          </p>
          <div className="mt-6 w-full">
            <Button variant="primary" className="h-10 w-full justify-center" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Drawer>
    )
  }

  return (
    <Drawer
      open
      onClose={onClose}
      size="xl"
      title={creating ? 'Create Organization Role' : role?.name || 'Role Permissions'}
      description={
        creating
          ? 'Define a new custom role and configure its granular permissions.'
          : role?.is_system
            ? 'System role configured for this organization.'
            : 'Inspect and configure exact permissions and access levels for this role.'
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!dirty || invalid || catalogQuery.isLoading}
            onClick={() => void handleSave()}
          >
            {creating ? 'Create role' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Role Meta Information */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-muted/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-accent" />
              <span className="text-sm font-semibold text-fg">Role Details</span>
            </div>
            {role?.is_system && (
              <Badge variant="info">
                <Lock className="mr-1 size-3" /> System Role
              </Badge>
            )}
          </div>

          <Input
            label="Role Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={role?.is_system}
            error={nameError}
            placeholder="e.g. Warehouse Supervisor, Procurement Lead"
            hint={role?.is_system ? 'System role names are predefined and cannot be renamed.' : 'Unique role title within your organization.'}
            required
          />

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Summarize the responsibilities and scope of this role…"
            hint="Helps administrators assign the right roles to team members."
          />
        </div>

        {/* Protection Alert for System Admin */}
        {isAdminSystemRole && (
          <div className="flex items-start gap-3 rounded-lg border border-info-ring bg-info-bg p-3.5 text-xs text-info-fg">
            <Shield className="mt-0.5 size-4 shrink-0 text-info-fg" />
            <div>
              <span className="font-semibold">Administrator Safeguard Active:</span> Essential role management and administrative permissions cannot be stripped from the primary Admin role to prevent accidental lockout.
            </div>
          </div>
        )}

        {/* Permission Matrix */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-fg">Permissions Matrix</h3>
              <p className="text-xs text-fg-muted">
                Configure module-level view, create, edit, delete, and approval privileges.
              </p>
            </div>
            <div className="text-xs font-medium text-fg-subtle">
              {selectedPermissions.length} permission{selectedPermissions.length === 1 ? '' : 's'} enabled
            </div>
          </div>

          {catalogQuery.isLoading && (
            <div className="flex items-center justify-center py-10 text-xs text-fg-muted">
              Loading permissions catalog…
            </div>
          )}

          {catalogQuery.isError && (
            <div className="flex items-center justify-between rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
              <span>Failed to load permission options.</span>
              <Button size="sm" onClick={() => void catalogQuery.refetch()}>
                Retry
              </Button>
            </div>
          )}

          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {catalog.map((item) => {
              const activeCount = item.actions.filter((a) => isActionChecked(item.module, a.action)).length
              const allChecked = activeCount === item.actions.length
              const noneChecked = activeCount === 0

              return (
                <div key={item.module} className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-hover/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg text-sm">{item.label}</span>
                      <Badge variant={activeCount > 0 ? 'info' : 'neutral'} className="text-[11px] py-0 px-1.5">
                        {activeCount}/{item.actions.length} enabled
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleAllForModule(item, true)}
                        className="text-accent hover:underline focus:outline-none"
                      >
                        Enable all
                      </button>
                      <span className="text-fg-subtle">·</span>
                      <button
                        type="button"
                        onClick={() => toggleAllForModule(item, false)}
                        className="text-fg-muted hover:text-fg hover:underline focus:outline-none"
                      >
                        Disable
                      </button>
                    </div>
                  </div>

                  {/* Actions Checkboxes */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {item.actions.map((act) => {
                      const permKey = `${item.module}:${act.action}`
                      const checked = isActionChecked(item.module, act.action)
                      const isLocked = isAdminSystemRole && (permKey === 'roles:view' || permKey === 'roles:edit')

                      return (
                        <label
                          key={act.action}
                          className={`flex items-center gap-2 rounded-md border p-2 text-xs transition-colors cursor-pointer select-none ${
                            checked
                              ? 'border-accent/40 bg-accent/5 text-fg font-medium'
                              : 'border-border bg-surface-muted/30 text-fg-muted hover:border-border-strong hover:bg-surface-muted/60'
                          } ${isLocked ? 'opacity-85 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isLocked}
                            onChange={(e) => togglePermission(item.module, act.action, e.target.checked)}
                            className="size-4 rounded border-border-strong accent-[var(--color-accent)]"
                          />
                          <span className="truncate">{act.label}</span>
                          {isLocked && <Lock className="ml-auto size-3 text-fg-subtle" />}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Drawer>
  )
}
