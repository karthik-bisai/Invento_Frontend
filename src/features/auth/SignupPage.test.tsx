import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { httpError, makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import { SignupPage } from './SignupPage'

function VerifyStub() {
  const state = useLocation().state as { email: string; emailSent: boolean; resendIn: number }
  return <p>Verify {state.email} sent={String(state.emailSent)} resend={state.resendIn}</p>
}

function renderSignup() {
  return renderApp(
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/signup/verify" element={<VerifyStub />} />
      <Route path="/login" element={<p>Login page</p>} />
      <Route path="/dashboard" element={<p>Home page</p>} />
    </Routes>,
    ['/signup'],
  )
}

async function fill(email: string, password: string, confirm = password, name = '') {
  const user = userEvent.setup()
  if (name) await user.type(screen.getByLabelText('Full name (optional)'), name)
  if (email) await user.type(screen.getByLabelText('Work email'), email)
  if (password) await user.type(screen.getByLabelText('Password'), password)
  if (confirm) await user.type(screen.getByLabelText('Confirm password'), confirm)
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  return user
}

describe('SignupPage', () => {
  it('blocks an empty or invalid submit and never calls the API', async () => {
    const post = vi.spyOn(api, 'post')
    renderSignup()

    await fill('nope', 'short', 'different')

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByText('Passwords don’t match.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('shows a password strength hint as you type', async () => {
    renderSignup()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Password'), 'abc')
    expect(screen.getByText('Too short')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Password'))
    await user.type(screen.getByLabelText('Password'), 'correct-horse-9')
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  it('creates the account and moves on to the code page, which is a page of its own', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { email: 'new@acme.com', email_sent: true, resend_in: 60 } } as never)
    renderSignup()

    await fill(' new@acme.com ', 'longenough1', 'longenough1', 'Nia New')

    expect(await screen.findByText('Verify new@acme.com sent=true resend=60')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/auth/signup', { email: 'new@acme.com', password: 'longenough1', full_name: 'Nia New' })
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument() // no longer on the sign-up form
  })

  it('omits the name when left blank', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { email: 'a@acme.com', email_sent: false, resend_in: 60 } } as never)
    renderSignup()
    await fill('a@acme.com', 'longenough1')
    expect(await screen.findByText(/sent=false/)).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/auth/signup', { email: 'a@acme.com', password: 'longenough1', full_name: undefined })
  })

  it('points duplicate emails to sign in', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(httpError(409, 'Email already registered'))
    renderSignup()

    await fill('admin@acme.com', 'longenough1')

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
  })

  it('shows throttling from the server', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(httpError(429, 'Too many attempts. Try again in 30 seconds.'))
    renderSignup()
    await fill('a@acme.com', 'longenough1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 30 seconds')
  })

  it('sends signed-in users to their overview', async () => {
    signedIn()
    mockGet({ '/auth/me': makeUser('ADMIN') })
    renderSignup()
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })
})
