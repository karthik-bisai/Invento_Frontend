import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SESSION_KEY } from '@/api/client'
import { httpError, makeUser, mockGet, mockPost } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import { LoginPage } from './LoginPage'

function renderLogin(entries: Parameters<typeof renderApp>[1] = ['/login']) {
  return renderApp(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<p>Home page</p>} />
      <Route path="/users" element={<p>Users page</p>} />
    </Routes>,
    entries,
  )
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  if (email) await user.type(screen.getByLabelText('Email'), email)
  if (password) await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

describe('LoginPage', () => {
  it('renders an email field, a masked password field and a submit button', () => {
    renderLogin()
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  describe('validation', () => {
    it('blocks an empty submit, explains why, and never calls the API', async () => {
      const post = mockPost({})
      renderLogin()

      await fillAndSubmit('', '')

      expect(screen.getByText('Enter your email.')).toBeInTheDocument()
      expect(screen.getByText('Enter your password.')).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()
    })

    it('rejects a malformed email', async () => {
      const post = mockPost({})
      renderLogin()

      await fillAndSubmit('not-an-email', 'secret')

      expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
      expect(post).not.toHaveBeenCalled()
    })

    it('shows a field error on blur, before any submit attempt', async () => {
      renderLogin()
      const user = userEvent.setup()

      await user.type(screen.getByLabelText('Email'), 'nope')
      expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
      await user.tab()

      expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    })
  })

  describe('submission', () => {
    it('sends trimmed credentials, stores the token, loads the profile and lands on the home page', async () => {
      const post = mockPost({ access_token: 'jwt-123', token_type: 'bearer' })
      const get = mockGet({ '/auth/me': makeUser('ADMIN') })
      renderLogin()

      await fillAndSubmit('  admin@acme.com ', 'Passw0rd!')

      expect(await screen.findByText('Home page')).toBeInTheDocument()
      expect(post).toHaveBeenCalledWith('/auth/login', { email: 'admin@acme.com', password: 'Passw0rd!' })
      expect(get).toHaveBeenCalledWith('/auth/me')
      expect(localStorage.getItem(SESSION_KEY)).toBe('1') // only a hint: the real session is an HTTP-only cookie
    })

    it('shows a busy, disabled button while the request is in flight and ignores double clicks', async () => {
      const post = mockPost({})
      post.mockReturnValue(new Promise(() => {})) // never resolves
      renderLogin()

      const user = await fillAndSubmit('admin@acme.com', 'pw')
      const button = screen.getByRole('button', { name: 'Sign in' })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')

      await user.click(button)
      expect(post).toHaveBeenCalledTimes(1)
    })

    it('submits with the Enter key', async () => {
      const post = mockPost({ access_token: 't', token_type: 'bearer' })
      mockGet({ '/auth/me': makeUser('ADMIN') })
      renderLogin()
      const user = userEvent.setup()

      await user.type(screen.getByLabelText('Email'), 'admin@acme.com')
      await user.type(screen.getByLabelText('Password'), 'pw{Enter}')

      await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    })
  })

  describe('failures', () => {
    it('shows "Incorrect email or password." on a 401 and keeps the user on the form', async () => {
      mockPost({}).mockRejectedValue(httpError(401, 'Incorrect email or password'))
      renderLogin()

      await fillAndSubmit('admin@acme.com', 'wrong')

      expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
      expect(screen.queryByText('Home page')).not.toBeInTheDocument()
      expect(localStorage.getItem(SESSION_KEY)).toBeNull()
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled() // can retry
    })

    it('reports an unreachable server', async () => {
      mockPost({}).mockRejectedValue(httpError(null))
      renderLogin()

      await fillAndSubmit('admin@acme.com', 'pw')

      expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    })

    it('falls back to a generic message for unexpected server errors', async () => {
      mockPost({}).mockRejectedValue(httpError(500))
      renderLogin()

      await fillAndSubmit('admin@acme.com', 'pw')

      expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in. Please try again.')
    })
  })

  describe('role-based redirect after login', () => {
    const entries = [{ pathname: '/login', state: { from: '/users' } }]

    it('returns an admin to the admin screen they were trying to open', async () => {
      mockPost({ access_token: 't', token_type: 'bearer' })
      mockGet({ '/auth/me': makeUser('ADMIN') })
      renderLogin(entries)

      await fillAndSubmit('admin@acme.com', 'pw')

      expect(await screen.findByText('Users page')).toBeInTheDocument()
    })

    it('sends warehouse staff to the home page instead of an admin screen they cannot open', async () => {
      mockPost({ access_token: 't', token_type: 'bearer' })
      mockGet({ '/auth/me': makeUser('WAREHOUSE_STAFF') })
      renderLogin(entries)

      await fillAndSubmit('staff@acme.com', 'pw')

      expect(await screen.findByText('Home page')).toBeInTheDocument()
      expect(screen.queryByText('Users page')).not.toBeInTheDocument()
    })
  })
})
