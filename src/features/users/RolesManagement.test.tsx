import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { OrganizationRole, PermissionCatalogItem } from '@/types'
import { RolesManagement } from './RolesManagement'

const me = makeUser('ADMIN')

const mockCatalog: PermissionCatalogItem[] = [
  {
    module: 'products',
    label: 'Products',
    actions: [
      { action: 'view', label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit', label: 'Edit' },
      { action: 'delete', label: 'Delete' },
    ],
  },
  {
    module: 'inventory',
    label: 'Inventory',
    actions: [
      { action: 'view', label: 'View' },
      { action: 'create', label: 'Create' },
      { action: 'edit', label: 'Edit' },
      { action: 'delete', label: 'Delete' },
    ],
  },
  {
    module: 'roles',
    label: 'Roles & Permissions',
    actions: [
      { action: 'view', label: 'View' },
      { action: 'edit', label: 'Edit' },
    ],
  },
]

const mockRoles: OrganizationRole[] = [
  {
    id: 'r1',
    organization_id: 'org-1',
    name: 'Admin',
    description: 'Full administrative access',
    is_system: true,
    permissions: ['products:view', 'products:create', 'roles:view', 'roles:edit'],
    user_count: 1,
  },
  {
    id: 'r2',
    organization_id: 'org-1',
    name: 'Warehouse Specialist',
    description: 'Custom specialist role',
    is_system: false,
    permissions: ['products:view'],
    user_count: 0,
  },
]

function setup() {
  signedIn()
  mockGet({
    '/auth/me': me,
    '/roles': mockRoles,
    '/roles/permissions-catalog': mockCatalog,
  })
  renderApp(<RolesManagement />, ['/users?tab=roles'])
}

describe('RolesManagement', () => {
  it('renders configured organization roles with user counts and badges', async () => {
    setup()
    expect(await screen.findByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Warehouse Specialist')).toBeInTheDocument()
    expect(screen.getByText('System Role')).toBeInTheDocument()
    expect(screen.getByText('Custom Role')).toBeInTheDocument()
    expect(screen.getByText('1 user')).toBeInTheDocument()
    expect(screen.getByText('0 users')).toBeInTheDocument()
  })

  it('allows opening role permissions editor drawer', async () => {
    setup()
    const user = userEvent.setup()
    const configureButtons = await screen.findAllByRole('button', { name: /Configure/i })
    await user.click(configureButtons[0])

    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByText('Permissions Matrix')).toBeInTheDocument()
  })

  it('allows deleting an unassigned custom role', async () => {
    setup()
    const del = vi.spyOn(api, 'delete').mockResolvedValue({ data: {} } as never)
    const user = userEvent.setup()

    const deleteBtn = await screen.findByRole('button', { name: /Delete Warehouse Specialist/i })
    await user.click(deleteBtn)

    const modal = within(await screen.findByRole('dialog'))
    expect(modal.getByText(/Delete Role “Warehouse Specialist”?/i)).toBeInTheDocument()

    await user.click(modal.getByRole('button', { name: 'Delete role' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('/roles/r2'))
  })
})
