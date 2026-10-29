import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { OrganizationRole, PermissionCatalogItem } from '@/types'
import { RoleDrawer } from './RoleDrawer'

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
    module: 'roles',
    label: 'Roles & Permissions',
    actions: [
      { action: 'view', label: 'View' },
      { action: 'edit', label: 'Edit' },
    ],
  },
]

const customRole: OrganizationRole = {
  id: 'r-custom',
  organization_id: 'org-1',
  name: 'Floor Staff',
  description: 'Floor workers',
  is_system: false,
  permissions: ['products:view'],
  user_count: 2,
}

const adminRole: OrganizationRole = {
  id: 'r-admin',
  organization_id: 'org-1',
  name: 'Admin',
  description: 'Admins',
  is_system: true,
  permissions: ['products:view', 'roles:view', 'roles:edit'],
  user_count: 1,
}

function setup(target: OrganizationRole | 'new', onClose = vi.fn()) {
  signedIn()
  mockGet({
    '/auth/me': me,
    '/roles/permissions-catalog': mockCatalog,
  })
  renderApp(<RoleDrawer target={target} onClose={onClose} />, ['/users?tab=roles'])
}

describe('RoleDrawer', () => {
  it('renders permission matrix and role details', async () => {
    setup(customRole)
    expect(await screen.findByDisplayValue('Floor Staff')).toBeInTheDocument()
    expect(screen.getByText('Permissions Matrix')).toBeInTheDocument()
    expect(await screen.findByText('Products')).toBeInTheDocument()
  })

  it('automatically checks view when an action like create is selected', async () => {
    setup(customRole)
    const user = userEvent.setup()
    const dialog = within(await screen.findByRole('dialog'))

    const createCheckbox = await dialog.findByLabelText('Create')
    await user.click(createCheckbox)

    const viewCheckboxes = dialog.getAllByLabelText('View')
    expect(viewCheckboxes[0]).toBeChecked()
  })

  it('locks critical administrative permissions on system admin role', async () => {
    setup(adminRole)
    const dialog = within(await screen.findByRole('dialog'))
    expect(await dialog.findByText(/Administrator Safeguard Active/i)).toBeInTheDocument()

    // Name input should be disabled for system roles
    const nameInput = dialog.getByDisplayValue('Admin')
    expect(nameInput).toBeDisabled()
  })

  it('saves updated permissions on submit', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} } as never)
    const onClose = vi.fn()
    setup(customRole, onClose)
    const user = userEvent.setup()
    const dialog = within(await screen.findByRole('dialog'))

    const createCheckbox = await dialog.findByLabelText('Create')
    await user.click(createCheckbox)

    const saveBtn = dialog.getByRole('button', { name: 'Save changes' })
    await user.click(saveBtn)

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        '/roles/r-custom',
        expect.objectContaining({
          permissions: expect.arrayContaining(['products:view', 'products:create']),
        }),
      ),
    )
    expect(onClose).toHaveBeenCalled()
  })
})
