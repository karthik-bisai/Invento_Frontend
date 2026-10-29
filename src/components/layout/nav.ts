import { BarChart3, Boxes, LayoutDashboard, Package, Users, Warehouse as WarehouseIcon, type LucideIcon } from 'lucide-react'
import type { Role, User } from '@/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Roles that can see/enter this route. Omit for everyone. */
  roles?: Role[]
  /** Granular permission code required to view this module. */
  permission?: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, permission: 'dashboard:view' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, permission: 'inventory:view' },
  { to: '/products', label: 'Products', icon: Package, permission: 'products:view' },
  { to: '/warehouses', label: 'Warehouses', icon: WarehouseIcon, roles: ['ADMIN', 'INVENTORY_MANAGER'], permission: 'warehouses:view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'INVENTORY_MANAGER'], permission: 'reports:view' },
  { to: '/users', label: 'Users', icon: Users, roles: ['ADMIN'], permission: 'users:view' },
]

export function canAccess(item: NavItem, userOrRole: User | Role | undefined | null): boolean {
  if (!userOrRole) return false

  if (typeof userOrRole === 'object') {
    const user = userOrRole as User
    const roleStr = String(user.role || '').toUpperCase()
    if (roleStr === 'ADMIN') return true

    if (item.permission && user.permissions && Array.isArray(user.permissions)) {
      if (user.permissions.includes(item.permission) || user.permissions.includes('*')) {
        return true
      }
    }

    return !item.roles || item.roles.includes(user.role)
  }

  const roleStr = String(userOrRole).toUpperCase()
  if (roleStr === 'ADMIN') return true
  return !item.roles || item.roles.includes(userOrRole as Role)
}
