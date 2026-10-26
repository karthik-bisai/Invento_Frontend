import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setThemeChoice } from '@/hooks/useTheme'
import { makeProfile, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import type { Role } from '@/types'
import { AppRoutes } from './App'

/** Every endpoint a signed-in screen reads, so each page can render without noise. */
function mockApiFor(role: Role) {
  mockGet({
    '/auth/me': makeProfile(role),
    '/inventory/summary': { total_products: 0, total_warehouses: 0, total_quantity_on_hand: 0, total_reserved_quantity: 0, total_available_quantity: 0, total_value: '0', low_stock_products: 0, warehouses: [] },
    '/inventory/low-stock': [],
    '/inventory': { items: [], total: 0, page: 1, size: 15 },
    '/warehouses': { items: [], total: 0, page: 1, size: 100 },
    '/products': { items: [], total: 0, page: 1, size: 15 },
    '/auth/users': { items: [], total: 0, page: 1, size: 15 },
    '/access-requests': { items: [], total: 0, page: 1, size: 10 },
    '/notifications': { items: [], unread: 0 },
    '/auth/sessions': { items: [] },
  })
}

const visit = (path: string | { pathname: string; state?: object }) => renderApp(<AppRoutes />, [path])
const heading = (name: string | RegExp, level = 1) => screen.findByRole('heading', { level, name })

afterEach(() => {
  setThemeChoice('system')
  vi.restoreAllMocks()
})

describe('public routes', () => {
  it.each([
    ['/', /Know what’s on every shelf/],
    ['/login', 'Welcome back'],
    ['/login/code', 'Sign in with a code'],
    ['/forgot-password', 'Reset your password'],
    ['/signup', 'Create your account'],
    ['/signup/pending', 'Request sent'],
    ['/terms', 'Terms of use'],
    ['/privacy', 'Privacy'],
  ])('%s opens its page', async (path, title) => {
    visit(path)
    expect(await heading(title)).toBeInTheDocument()
  })

  it('sends people who land on a code page without an email back to the page that asks for it', async () => {
    visit('/signup/verify')
    expect(await heading('Create your account')).toBeInTheDocument()
    visit('/reset-password')
    expect(await heading('Reset your password')).toBeInTheDocument()
  })

  it('shows a real 404 page for an address that does not exist, with a way home', async () => {
    visit('/definitely/not/here')
    expect(await heading('We can’t find that page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/')
  })

  it('keeps the product name consistent', async () => {
    visit('/')
    await heading(/Know what’s on every shelf/)
    expect(screen.getAllByText('Invento').length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toMatch(/Inventory Management/)
  })
})

describe('moving between the public pages', () => {
  it('walks sign-up, sign-in, code sign-in and password reset by clicking links', async () => {
    visit('/')
    const user = userEvent.setup()
    await user.click((await screen.findAllByRole('link', { name: 'Sign in' }))[0] as HTMLElement)
    await heading('Welcome back')

    await user.click(screen.getByRole('link', { name: 'Create an account' }))
    await heading('Create your account')
    await user.click(screen.getByRole('link', { name: 'Sign in' }))
    await heading('Welcome back')

    await user.click(screen.getByRole('link', { name: 'Forgot password?' }))
    await heading('Reset your password')
    await user.click(screen.getByRole('link', { name: 'Back to sign in' }))
    await heading('Welcome back')

    await user.click(screen.getByRole('button', { name: 'Email me a sign-in code' }))
    await heading('Sign in with a code')
    await user.click(screen.getByRole('link', { name: 'Sign in with a password' }))
    await heading('Welcome back')
  })

  it('reaches the legal pages from the sign-in page and from the landing page', async () => {
    visit('/login')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: 'Terms' }))
    await heading('Terms of use')
    await user.click(screen.getByRole('link', { name: 'Privacy' }))
    await heading('Privacy')
    await user.click(screen.getByRole('link', { name: 'Back to home' }))
    await heading(/Know what’s on every shelf/)
    expect(within(screen.getByRole('navigation', { name: 'Legal' })).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual(['/terms', '/privacy'])
  })

  it('links the sign-up form to the terms and privacy notice', async () => {
    visit('/signup')
    expect(await screen.findByRole('link', { name: 'Privacy notice' })).toHaveAttribute('href', '/privacy')
  })
})

describe('signed-out visitors', () => {
  it.each(['/dashboard', '/inventory', '/products', '/warehouses', '/reports', '/users', '/profile', '/settings'])('%s sends them to sign in', async (path) => {
    visit(path)
    expect(await heading('Welcome back')).toBeInTheDocument()
  })
})

describe('signed-in routes', () => {
  it.each([
    ['/dashboard', 'Overview'],
    ['/inventory', 'Inventory'],
    ['/products', 'Products'],
    ['/warehouses', 'Warehouses'],
    ['/reports', 'Reports'],
    ['/users', 'Users'],
    ['/profile', 'Profile'],
    ['/settings', 'Settings'],
  ])('an administrator can open %s', async (path, title) => {
    signedIn()
    mockApiFor('ADMIN')
    visit(path)
    expect(await heading(title)).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument() // dock
    expect(screen.getByRole('link', { name: 'Invento home' })).toHaveAttribute('href', '/dashboard')
  })

  it('shows signed-in people their overview instead of the landing, sign-in or sign-up pages', async () => {
    for (const path of ['/', '/login', '/signup', '/login/code']) {
      signedIn()
      mockApiFor('ADMIN')
      const view = visit(path)
      expect(await heading('Overview')).toBeInTheDocument()
      view.unmount()
    }
  })

  it('stops a role from opening a screen it may not use', async () => {
    signedIn()
    mockApiFor('WAREHOUSE_STAFF')
    visit('/users')
    expect(await screen.findByText('Access restricted')).toBeInTheDocument()
  })

  it('shows the 404 page, with a link to the overview, for a bad address', async () => {
    signedIn()
    mockApiFor('ADMIN')
    visit('/nope')
    expect(await heading('We can’t find that page')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Go to overview' })).toHaveAttribute('href', '/dashboard')
  })

  it('reaches Profile and Settings from the account menu', async () => {
    signedIn()
    mockApiFor('INVENTORY_MANAGER')
    visit('/dashboard')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(await heading('Settings')).toBeInTheDocument()
  })

  it('reaches every dock destination for its role', async () => {
    signedIn()
    mockApiFor('ADMIN')
    visit('/dashboard')
    await heading('Overview')
    const dock = await screen.findByRole('navigation', { name: 'Primary' })
    const user = userEvent.setup()
    for (const [name, title] of [['Inventory', 'Inventory'], ['Products', 'Products'], ['Warehouses', 'Warehouses'], ['Reports', 'Reports'], ['Users', 'Users'], ['Overview', 'Overview']]) {
      await user.click(await within(dock).findByRole('link', { name }))
      expect(await heading(title as string)).toBeInTheDocument()
    }
  })
})
