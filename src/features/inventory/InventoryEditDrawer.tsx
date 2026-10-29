import { useState } from 'react'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/AuthContext'
import { getCurrencyInfo } from '@/lib/currency'
import { int, money } from '@/lib/format'
import type { InventoryRow } from '@/types'
import { useSetReorderLevel, useUpdateProduct, useUpdateStock } from './hooks'
import { StockBadge } from './stock'
import { getStockStatus } from './stockStatus'

const WHOLE = /^\d+$/
const PRICE = /^\d{1,10}(\.\d{1,2})?$/

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  )
}

interface Props {
  row: InventoryRow | null
  onClose: () => void
}

/**
 * Permissions (mirrors backend):
 *  - everyone:          stock counts (on hand / reserved)
 *  - inventory manager: + reorder level
 *  - admin:             + all product details
 * Mount with `key={row.id}` so form state resets per record.
 */
export function InventoryEditDrawer({ row, onClose }: Props) {
  const { user, hasRole, can } = useAuth()
  const currencyInfo = getCurrencyInfo(user?.organization_currency)
  const canEditStock = can('inventory:edit') || hasRole('ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_STAFF')
  const isAdmin = can('products:edit') || hasRole('ADMIN')
  const canEditReorder = can('products:edit') || hasRole('ADMIN', 'INVENTORY_MANAGER')

  const updateStock = useUpdateStock()
  const updateProduct = useUpdateProduct()
  const setReorder = useSetReorderLevel()

  const [onHand, setOnHand] = useState(String(row?.quantity_on_hand ?? ''))
  const [reserved, setReserved] = useState(String(row?.reserved_quantity ?? ''))
  const [reorder, setReorderLevel] = useState(String(row?.reorder_level ?? ''))
  const [name, setName] = useState(row?.product_name ?? '')
  const [sku, setSku] = useState(row?.sku ?? '')
  const [category, setCategory] = useState(row?.category ?? '')
  const [price, setPrice] = useState(row ? Number(row.unit_price).toFixed(2) : '')
  const [serverError, setServerError] = useState<string>()
  const [saving, setSaving] = useState(false)

  if (!row) {
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    )
  }

  const errors = {
    onHand: WHOLE.test(onHand) ? undefined : 'Enter a whole number, 0 or more.',
    reserved: !WHOLE.test(reserved)
      ? 'Enter a whole number, 0 or more.'
      : WHOLE.test(onHand) && Number(reserved) > Number(onHand)
        ? 'Cannot exceed quantity on hand.'
        : undefined,
    reorder: canEditReorder && !WHOLE.test(reorder) ? 'Enter a whole number, 0 or more.' : undefined,
    name: isAdmin && !name.trim() ? 'Required.' : undefined,
    sku: isAdmin && !sku.trim() ? 'Required.' : undefined,
    category: isAdmin && !category.trim() ? 'Required.' : undefined,
    price: isAdmin && !PRICE.test(price) ? 'Enter an amount like 12.50.' : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)

  const stockDirty = onHand !== String(row.quantity_on_hand) || reserved !== String(row.reserved_quantity)
  const reorderDirty = canEditReorder && reorder !== String(row.reorder_level)
  const productFields = {
    ...(name.trim() !== row.product_name && { name: name.trim() }),
    ...(sku.trim() !== row.sku && { sku: sku.trim() }),
    ...(category.trim() !== row.category && { category: category.trim() }),
    ...(price !== Number(row.unit_price).toFixed(2) && { unit_price: price }),
    ...(reorderDirty && { reorder_level: Number(reorder) }),
  }
  const productDirty = isAdmin ? Object.keys(productFields).length > 0 : false
  const dirty = (canEditStock && stockDirty) || productDirty || (!isAdmin && canEditReorder && reorderDirty)

  async function save() {
    if (!row) return
    setSaving(true)
    setServerError(undefined)
    try {
      if (stockDirty) {
        await updateStock.mutateAsync({ id: row.id, quantity_on_hand: Number(onHand), reserved_quantity: Number(reserved) })
      }
      if (isAdmin && productDirty) {
        await updateProduct.mutateAsync({ id: row.product_id, data: productFields })
      } else if (!isAdmin && reorderDirty) {
        await setReorder.mutateAsync({ productId: row.product_id, reorderLevel: Number(reorder) })
      }
      onClose()
    } catch (err) {
      setServerError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const status = getStockStatus(row.product_total_quantity, row.reorder_level)
  const roleHint = isAdmin
    ? 'You can edit stock counts and all product details.'
    : canEditReorder
      ? 'You can edit stock counts and the reorder level.'
      : 'You can edit stock counts. Product details are managed by inventory managers.'

  return (
    <Drawer
      open
      onClose={onClose}
      title={row.product_name}
      description={`${row.sku} · ${row.warehouse_name}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} disabled={!dirty || invalid} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (dirty && !invalid) void save()
        }}
      >
        <div className="flex items-center justify-between rounded-md border border-border bg-surface-muted px-3 py-2">
          <div>
            <p className="eyebrow">Stock status</p>
            <p className="num mt-0.5 text-xs text-fg-muted">
              {int.format(row.product_total_quantity)} total across warehouses · reorder at {int.format(row.reorder_level)}
            </p>
          </div>
          <StockBadge status={status} />
        </div>

        <p className="text-xs text-fg-muted">{roleHint}</p>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold">Stock at {row.warehouse_name}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input label="On hand" inputMode="numeric" value={onHand} onChange={(e) => setOnHand(e.target.value)} error={errors.onHand} disabled={!canEditStock} className="num" />
            <Input label="Reserved" inputMode="numeric" value={reserved} onChange={(e) => setReserved(e.target.value)} error={errors.reserved} disabled={!canEditStock} className="num" />
          </div>
          <p className="num text-xs text-fg-subtle">
            Available: {WHOLE.test(onHand) && WHOLE.test(reserved) ? int.format(Number(onHand) - Number(reserved)) : '—'}
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold">Product</legend>
          {isAdmin ? (
            <>
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} error={errors.sku} className="font-mono" />
                <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} error={errors.category} />
              </div>
              <Input label={`Unit price (${currencyInfo.code})`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} className="num" />
            </>
          ) : (
            <dl className="grid grid-cols-2 gap-3">
              <ReadOnly label="Name" value={row.product_name} />
              <ReadOnly label="SKU" value={row.sku} />
              <ReadOnly label="Category" value={row.category} />
              <ReadOnly label="Unit price" value={money.format(row.unit_price, user?.organization_currency)} />
            </dl>
          )}
          {canEditReorder ? (
            <Input
              label="Reorder level"
              inputMode="numeric"
              value={reorder}
              onChange={(e) => setReorderLevel(e.target.value)}
              error={errors.reorder}
              hint="Alerts trigger when total stock across warehouses falls to this number. 0 disables alerts."
              className="num"
            />
          ) : (
            <dl>
              <ReadOnly label="Reorder level" value={int.format(row.reorder_level)} />
            </dl>
          )}
        </fieldset>

        {serverError && (
          <p role="alert" className="rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
            {serverError}
          </p>
        )}
        <button type="submit" className="sr-only" tabIndex={-1}>
          Save
        </button>
      </form>
    </Drawer>
  )
}
