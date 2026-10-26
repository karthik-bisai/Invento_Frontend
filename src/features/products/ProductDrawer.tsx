import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/AuthContext'
import { StockedList } from '@/features/inventory/StockedList'
import type { Product } from '@/types'
import { useCreateProduct, useDeleteProduct, useEditProduct, useReorderLevel } from './hooks'

const WHOLE = /^\d+$/
const PRICE = /^\d{1,10}(\.\d{1,2})?$/

/** `'new'` opens the create form; a product opens the edit form; null is closed. */
export type ProductTarget = Product | 'new' | null

interface Props {
  target: ProductTarget
  onClose: () => void
}

/**
 * Permissions (mirrors backend):
 *  - admin:             create, edit every field, delete
 *  - inventory manager: create, edit reorder level only
 *  - warehouse staff:   read-only
 * Mount with `key={product?.id ?? target}` so form state resets per record.
 */
export function ProductDrawer({ target, onClose }: Props) {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('ADMIN')
  const isManager = hasRole('ADMIN', 'INVENTORY_MANAGER')
  const product = target && target !== 'new' ? target : null
  const creating = target === 'new'

  const create = useCreateProduct()
  const edit = useEditProduct()
  const setReorder = useReorderLevel()
  const remove = useDeleteProduct()

  const [sku, setSku] = useState(product?.sku ?? '')
  const [name, setName] = useState(product?.name ?? '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [price, setPrice] = useState(product ? Number(product.unit_price).toFixed(2) : '')
  const [reorder, setReorderLevel] = useState(String(product?.reorder_level ?? 0))
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

  const fullEdit = creating || isAdmin // can change every field
  const readOnly = !creating && !isManager
  const errors = {
    sku: fullEdit && !sku.trim() ? 'Required.' : undefined,
    name: fullEdit && !name.trim() ? 'Required.' : undefined,
    category: fullEdit && !category.trim() ? 'Required.' : undefined,
    price: fullEdit && !PRICE.test(price) ? 'Enter an amount like 12.50.' : undefined,
    reorder: !readOnly && !WHOLE.test(reorder) ? 'Enter a whole number, 0 or more.' : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)

  const changes: Partial<Omit<Product, 'id'>> = product
    ? {
        ...(fullEdit && sku.trim() !== product.sku && { sku: sku.trim() }),
        ...(fullEdit && name.trim() !== product.name && { name: name.trim() }),
        ...(fullEdit && category.trim() !== product.category && { category: category.trim() }),
        ...(fullEdit && price !== Number(product.unit_price).toFixed(2) && { unit_price: price }),
        ...(!readOnly && reorder !== String(product.reorder_level) && { reorder_level: Number(reorder) }),
      }
    : {}
  const dirty = creating || Object.keys(changes).length > 0

  async function save() {
    setSaving(true)
    setError(undefined)
    try {
      if (creating) {
        await create.mutateAsync({ sku: sku.trim(), name: name.trim(), category: category.trim(), unit_price: price, reorder_level: Number(reorder) })
      } else if (product && isAdmin) {
        await edit.mutateAsync({ id: product.id, data: changes })
      } else if (product) {
        await setReorder.mutateAsync({ id: product.id, reorderLevel: Number(reorder) })
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    if (!product) return
    setDeleteError(undefined)
    try {
      await remove.mutateAsync(product.id)
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
        title={creating ? 'New product' : product!.name}
        description={creating ? 'Add a product to the catalogue' : product!.sku}
        footer={
          <>
            {isAdmin && product && (
              <Button variant="ghost" className="mr-auto text-crit-fg" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-3.5" aria-hidden />
                Delete
              </Button>
            )}
            <Button onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</Button>
            {!readOnly && (
              <Button variant="primary" loading={saving} disabled={!dirty || invalid} onClick={save}>
                {creating ? 'Create product' : 'Save changes'}
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
          {!creating && !isAdmin && (
            <p className="text-xs text-fg-muted">
              {isManager ? 'You can edit the reorder level. Other details are managed by administrators.' : 'Product details are read-only for your role.'}
            </p>
          )}
          <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} error={errors.sku} disabled={!fullEdit} className="font-mono" />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} disabled={!fullEdit} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} error={errors.category} disabled={!fullEdit} />
            <Input label="Unit price (USD)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} disabled={!fullEdit} className="num" />
          </div>
          <Input
            label="Reorder level"
            inputMode="numeric"
            value={reorder}
            onChange={(e) => setReorderLevel(e.target.value)}
            error={errors.reorder}
            disabled={readOnly}
            hint="Alerts trigger when total stock across warehouses falls to this number. 0 disables alerts."
            className="num"
          />
          {error && (
            <p role="alert" className="rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
              {error}
            </p>
          )}
          <button type="submit" className="sr-only" tabIndex={-1}>
            Save
          </button>
        </form>
        {product && (
          <div className="mt-6 border-t border-border pt-5">
            <StockedList productId={product.id} />
          </div>
        )}
      </Drawer>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete product?"
        message={`“${product?.name}” will be removed from the catalogue. Products that still have stock records can't be deleted.`}
        loading={remove.isPending}
        error={deleteError}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
