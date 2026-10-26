import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/AuthContext'
import { StockedList } from '@/features/inventory/StockedList'
import type { Warehouse } from '@/types'
import { useCreateWarehouse, useDeleteWarehouse, useEditWarehouse } from './hooks'

export type WarehouseTarget = Warehouse | 'new' | null

interface Props {
  target: WarehouseTarget
  onClose: () => void
}

/** Admins create, edit and delete; inventory managers can create and view. Mount with a per-record `key`. */
export function WarehouseDrawer({ target, onClose }: Props) {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('ADMIN')
  const warehouse = target && target !== 'new' ? target : null
  const creating = target === 'new'

  const create = useCreateWarehouse()
  const edit = useEditWarehouse()
  const remove = useDeleteWarehouse()

  const [name, setName] = useState(warehouse?.name ?? '')
  const [location, setLocation] = useState(warehouse?.location ?? '')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string>()

  if (!target) {
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    )
  }

  const readOnly = !creating && !isAdmin
  const errors = {
    name: name.trim() ? undefined : 'Required.',
    location: location.trim() ? undefined : 'Required.',
  }
  const invalid = Object.values(errors).some(Boolean)
  const dirty = creating || name.trim() !== warehouse?.name || location.trim() !== warehouse?.location

  async function save() {
    setSaving(true)
    setError(undefined)
    try {
      const data = { name: name.trim(), location: location.trim() }
      if (warehouse) await edit.mutateAsync({ id: warehouse.id, data })
      else await create.mutateAsync(data)
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    if (!warehouse) return
    setDeleteError(undefined)
    try {
      await remove.mutateAsync(warehouse.id)
      setConfirmDelete(false)
      onClose()
    } catch (err) {
      setDeleteError(getErrorMessage(err))
    }
  }

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={creating ? 'New warehouse' : warehouse!.name}
        description={creating ? 'Add a stocking location' : warehouse!.location}
        footer={
          <>
            {isAdmin && warehouse && (
              <Button variant="ghost" className="mr-auto text-crit-fg" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </Button>
            )}
            <Button onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
            {!readOnly && (
              <Button variant="primary" loading={saving} disabled={!dirty || invalid} onClick={save}>
                {creating ? 'Create warehouse' : 'Save changes'}
              </Button>
            )}
          </>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (dirty && !invalid && !readOnly) void save()
          }}
        >
          {readOnly && <p className="text-xs text-fg-muted">Only administrators can edit or delete warehouses.</p>}
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} disabled={readOnly} />
          <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} error={errors.location} disabled={readOnly} />
          {error && (
            <p role="alert" className="rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
              {error}
            </p>
          )}
          <button type="submit" className="sr-only" tabIndex={-1}>
            Save
          </button>
        </form>
        {warehouse && (
          <div className="mt-6 border-t border-border pt-5">
            <StockedList warehouseId={warehouse.id} />
          </div>
        )}
      </Drawer>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete warehouse?"
        message={`“${warehouse?.name}” will be removed. Warehouses that still hold stock records can't be deleted.`}
        loading={remove.isPending}
        error={deleteError}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
