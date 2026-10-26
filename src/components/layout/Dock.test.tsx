import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { Role } from '@/types'
import { Dock } from './Dock'

async function setup(role: Role, path = '/inventory') {
  signedIn()
  mockGet({ '/auth/me': makeUser(role) })
  renderApp(<Dock />, [path])
  await screen.findByRole('link', { name: 'Overview' })
}

const names = () => screen.getAllByRole('link').map((l) => l.getAttribute('aria-label'))
/** The dock first renders the unrestricted links, then the rest once the signed-in user's role arrives. */
const expectNames = (expected: string[]) => waitFor(() => expect(names()).toEqual(expected))

describe('Dock', () => {
  it('shows every destination to admins', async () => {
    await setup('ADMIN')
    await expectNames(['Overview', 'Inventory', 'Products', 'Warehouses', 'Reports', 'Users'])
  })

  it('hides users from managers', async () => {
    await setup('INVENTORY_MANAGER')
    await expectNames(['Overview', 'Inventory', 'Products', 'Warehouses', 'Reports'])
  })

  it('shows warehouse staff only the screens they can open', async () => {
    await setup('WAREHOUSE_STAFF')
    await expectNames(['Overview', 'Inventory', 'Products'])
  })

  it('marks the current page for assistive tech', async () => {
    await setup('ADMIN', '/products')
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Inventory' })).not.toHaveAttribute('aria-current')
  })

  it('is a labelled navigation landmark', async () => {
    await setup('ADMIN')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })
})
