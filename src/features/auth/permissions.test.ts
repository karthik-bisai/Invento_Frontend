import { describe, expect, it } from 'vitest'
import type { User } from '@/types'
import { hasAllPermissions, hasAnyPermission, hasPermission } from './permissions'

describe('permissions utilities', () => {
  const adminUser: User = {
    id: 'u1',
    email: 'admin@test.com',
    role: 'ADMIN',
    is_active: true,
  }

  const staffUser: User = {
    id: 'u2',
    email: 'staff@test.com',
    role: 'WAREHOUSE_STAFF',
    is_active: true,
    permissions: ['inventory:view', 'inventory:edit', 'products:view'],
  }

  const wildcardUser: User = {
    id: 'u3',
    email: 'manager@test.com',
    role: 'WAREHOUSE_MANAGER',
    is_active: true,
    permissions: ['inventory:*', 'products:view'],
  }

  it('admin user has all permissions regardless of permissions array', () => {
    expect(hasPermission(adminUser, 'users:delete')).toBe(true)
    expect(hasPermission(adminUser, 'products:edit')).toBe(true)
    expect(hasPermission(adminUser, 'arbitrary:permission')).toBe(true)
  })

  it('checks granular permissions for non-admin users', () => {
    expect(hasPermission(staffUser, 'inventory:view')).toBe(true)
    expect(hasPermission(staffUser, 'inventory:edit')).toBe(true)
    expect(hasPermission(staffUser, 'products:view')).toBe(true)
    expect(hasPermission(staffUser, 'products:edit')).toBe(false)
    expect(hasPermission(staffUser, 'warehouses:create')).toBe(false)
  })

  it('respects module wildcard permissions', () => {
    expect(hasPermission(wildcardUser, 'inventory:view')).toBe(true)
    expect(hasPermission(wildcardUser, 'inventory:edit')).toBe(true)
    expect(hasPermission(wildcardUser, 'inventory:delete')).toBe(true)
    expect(hasPermission(wildcardUser, 'products:view')).toBe(true)
    expect(hasPermission(wildcardUser, 'products:edit')).toBe(false)
  })

  it('returns false for null or undefined users', () => {
    expect(hasPermission(null, 'inventory:view')).toBe(false)
    expect(hasPermission(undefined, 'inventory:view')).toBe(false)
  })

  it('hasAnyPermission returns true if any permission matches', () => {
    expect(hasAnyPermission(staffUser, 'users:edit', 'inventory:view')).toBe(true)
    expect(hasAnyPermission(staffUser, 'users:edit', 'warehouses:view')).toBe(false)
    expect(hasAnyPermission(adminUser, 'nonexistent:action')).toBe(true)
  })

  it('hasAllPermissions checks all required permissions', () => {
    expect(hasAllPermissions(staffUser, 'inventory:view', 'products:view')).toBe(true)
    expect(hasAllPermissions(staffUser, 'inventory:view', 'warehouses:view')).toBe(false)
    expect(hasAllPermissions(adminUser, 'a:1', 'b:2')).toBe(true)
  })
})
