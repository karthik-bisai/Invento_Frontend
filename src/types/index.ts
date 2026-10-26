// Mirrors backend Pydantic schemas (app/schemas/*). Decimals arrive as strings.

export type Role = 'ADMIN' | 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF'

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  INVENTORY_MANAGER: 'Inventory Manager',
  WAREHOUSE_STAFF: 'Warehouse Staff',
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Preferences {
  theme: ThemePreference
  compact_tables: boolean
  reduce_motion: boolean
  notify_low_stock: boolean
  notify_email_access_requests: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  compact_tables: false,
  reduce_motion: false,
  notify_low_stock: true,
  notify_email_access_requests: true,
}

export interface User {
  id: string
  email: string
  role: Role
  is_active: boolean
  email_verified?: boolean
  full_name?: string | null
  job_title?: string | null
  phone?: string | null
  avatar_url?: string | null
  preferences?: Preferences
  created_at?: string | null
}

export interface UserBrief {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AccessRequest {
  id: string
  status: RequestStatus
  created_at: string
  decided_at?: string | null
  note?: string | null
  user: UserBrief
}

export interface AppNotification {
  id: string
  kind: string
  title: string
  body?: string | null
  link?: string | null
  read_at?: string | null
  created_at: string
}

export interface DeviceSession {
  id: string
  current: boolean
  ip: string
  user_agent: string
  created_at: string
  last_seen: string
}

/** Name to show for a person: their full name if they set one, otherwise their email. */
export const displayName = (u: { full_name?: string | null; email: string }) => u.full_name || u.email

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface Product {
  id: string
  sku: string
  name: string
  category: string
  unit_price: string
  reorder_level: number
}

export interface Warehouse {
  id: string
  name: string
  location: string
}

export interface InventoryItem {
  id: string
  product_id: string
  warehouse_id: string
  quantity_on_hand: number
  reserved_quantity: number
  available_quantity: number
}

/** Inventory item joined with product + warehouse details (GET /inventory). */
export interface InventoryRow extends InventoryItem {
  sku: string
  product_name: string
  category: string
  unit_price: string
  reorder_level: number
  warehouse_name: string
  /** On hand across all warehouses; drives the stock status. */
  product_total_quantity: number
}

export type InventorySortKey =
  | 'sku'
  | 'name'
  | 'warehouse'
  | 'quantity_on_hand'
  | 'reserved_quantity'
  | 'available_quantity'

export interface WarehouseSummary {
  warehouse_id: string
  name: string
  quantity_on_hand: number
  reserved_quantity: number
  total_value: string
}

export interface InventorySummary {
  total_products: number
  total_warehouses: number
  total_quantity_on_hand: number
  total_reserved_quantity: number
  total_available_quantity: number
  total_value: string
  low_stock_products: number
  warehouses: WarehouseSummary[]
}

export interface LowStockItem {
  product_id: string
  sku: string
  name: string
  quantity_on_hand: number
  reorder_level: number
  status: 'low' | 'critical'
}
