import { BarChart3, Boxes, LayoutDashboard, Package, Users, Warehouse as WarehouseIcon, type LucideIcon } from 'lucide-react'
import type { Role } from '@/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Roles that can see/enter this route. Omit for everyone. */
  roles?: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/warehouses', label: 'Warehouses', icon: WarehouseIcon, roles: ['ADMIN', 'INVENTORY_MANAGER'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'INVENTORY_MANAGER'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['ADMIN'] },
]

export function canAccess(item: NavItem, role: Role | undefined) {
  return !item.roles || (!!role && item.roles.includes(role))
}
