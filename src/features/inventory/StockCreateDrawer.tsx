import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { api } from '@/api/client'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { int } from '@/lib/format'
import type { Product } from '@/types'
import { useCreateStock, useWarehouses } from './hooks'
import { ProductPicker } from './ProductPicker'

const WHOLE = /^\d+$/

export interface StockPreset {
  productId?: string
  warehouseId?: string
}

interface Props {
  /** null = closed. Pass `{}` to open empty, or a preset to start with a product or warehouse chosen. */
  preset: StockPreset | null
  onClose: () => void
}

/**
 * Put a product into a warehouse: this is what links the two catalogues. A product can sit in many
 * warehouses with a count in each; this creates one such record. Mount with a per-open `key`.
 */
export function StockCreateDrawer({ preset, onClose }: Props) {
  const warehouses = useWarehouses()
  const create = useCreateStock()
  const presetProduct = useQuery({
    queryKey: ['products', 'one', preset?.productId],
    queryFn: async () => (await api.get<Product>(`/products/${preset?.productId}`)).data,
    enabled: !!preset?.productId,
  })

  const [chosen, setChosen] = useState<Product | null | undefined>(undefined) // undefined = untouched, so the preset applies
  const product = chosen === undefined ? (presetProduct.data ?? null) : chosen
  const [warehouseId, setWarehouseId] = useState(preset?.warehouseId ?? '')
  const [onHand, setOnHand] = useState('0')
  const [reserved, setReserved] = useState('0')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string>()

  if (!preset) {
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    )
  }

  const errors = {
    product: product ? undefined : 'Choose a product.',
    warehouse: warehouseId ? undefined : 'Choose a warehouse.',
    onHand: WHOLE.test(onHand) ? undefined : 'Enter a whole number, 0 or more.',
    reserved: !WHOLE.test(reserved)
      ? 'Enter a whole number, 0 or more.'
      : WHOLE.test(onHand) && Number(reserved) > Number(onHand)
        ? 'Cannot exceed quantity on hand.'
        : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)

  async function save() {
    setTouched(true)
    if (invalid || !product) return
    setError(undefined)
    try {
      await create.mutateAsync({ product_id: product.id, warehouse_id: warehouseId, quantity_on_hand: Number(onHand), reserved_quantity: Number(reserved) })
      onClose()
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 409
          ? 'This product is already stocked in that warehouse. Update its count from the table instead.'
          : getErrorMessage(err, 'We couldn’t add that stock. Please try again.'),
      )
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Add stock"
      description="Choose where a product is kept and how many are there."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={create.isPending} onClick={() => void save()}>
            Add stock
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <ProductPicker value={product} onChange={setChosen} error={touched ? errors.product : undefined} />

        <div className="flex flex-col gap-1">
          <label htmlFor="stock-warehouse" className="text-xs font-medium text-fg-muted">
            Warehouse
          </label>
          <Select id="stock-warehouse" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">Choose a warehouse…</option>
            {warehouses.data?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          {touched && errors.warehouse && <p className="text-xs text-crit-fg">{errors.warehouse}</p>}
          {warehouses.data?.length === 0 && <p className="text-xs text-fg-muted">There are no warehouses yet. Add one under Warehouses first.</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="On hand" inputMode="numeric" value={onHand} onChange={(e) => setOnHand(e.target.value)} error={touched ? errors.onHand : undefined} className="num" />
          <Input label="Reserved" inputMode="numeric" value={reserved} onChange={(e) => setReserved(e.target.value)} error={touched ? errors.reserved : undefined} className="num" />
        </div>
        <p className="num -mt-2 text-xs text-fg-subtle">Available: {WHOLE.test(onHand) && WHOLE.test(reserved) ? int.format(Math.max(Number(onHand) - Number(reserved), 0)) : '—'}</p>

        {error && (
          <p role="alert" className="animate-pop rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
            {error}
          </p>
        )}
        <button type="submit" className="sr-only" tabIndex={-1}>
          Add
        </button>
      </form>
    </Drawer>
  )
}
