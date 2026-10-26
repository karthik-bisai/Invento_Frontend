import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, SESSION_KEY } from '@/api/client'
import { apiError, makeProfile, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import { CodeSignInPage } from './CodeSignInPage'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetPasswordPage } from './ResetPasswordPage'

afterEach(() => vi.restoreAllMocks())

const digit = (n: number) => screen.getByLabelText(`Digit ${n} of 6`)

function Stub({ name }: { name: string }) {
  const s = useLocation().state as { email?: string; notice?: string } | null
  return (
    <p>
      {name} {s?.email} {s?.notice}
    </p>
  )
}

describe('CodeSignInPage', () => {
  const renderPage = (state?: object) =>
    renderApp(
      <Routes>
        <Route path="/login/code" element={<CodeSignInPage />} />
        <Route path="/login" element={<p>Password page</p>} />
        <Route path="/dashboard" element={<p>Home page</p>} />
      </Routes>,
      [{ pathname: '/login/code', state }],
    )

  it('starts with just an email field, filled in if the person already typed one', () => {
    renderPage({ email: 'pat@acme.com' })
    expect(screen.getByRole('heading', { name: 'Sign in with a code' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('pat@acme.com')
  })

  it('checks the email before asking for a code', async () => {
    const post = vi.spyOn(api, 'post')
    renderPage()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Email me a code' }))
    expect(screen.getByText('Enter your email.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('asks for the code without confirming whether the account exists', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'sent', resend_in: 60 } } as never)
    renderPage()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), '  pat@acme.com ')
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/auth/login-code/request', { email: 'pat@acme.com' })
    expect(screen.getByText(/If pat@acme.com has an Invento account, we’ve sent it a code/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send a new code in 60s' })).toBeDisabled()
  })

  it('signs in as soon as the sixth digit is typed', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'sent', resend_in: 60 } } as never)
    mockGet({ '/auth/me': makeProfile('ADMIN') })
    renderPage({ email: 'pat@acme.com' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))
    await user.type(await screen.findByLabelText('Digit 1 of 6'), '482913')

    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/auth/login-code/verify', { email: 'pat@acme.com', code: '482913' })
    expect(localStorage.getItem(SESSION_KEY)).toBe('1')
  })

  it('shows a wrong code, clears the boxes and lets them try again', async () => {
    vi.spyOn(api, 'post').mockImplementation((async (url: string) => {
      if (url.endsWith('/request')) return { data: { status: 'sent', resend_in: 60 } }
      throw apiError(400, "That code isn't right. 4 tries left.", 'otp_invalid')
    }) as never)
    renderPage({ email: 'pat@acme.com' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))
    await user.type(await screen.findByLabelText('Digit 1 of 6'), '000000')

    expect(await screen.findByRole('alert')).toHaveTextContent('4 tries left')
    expect(digit(1)).toHaveValue('')
  })

  it('explains an account that is not allowed in yet, instead of signing in', async () => {
    vi.spyOn(api, 'post').mockImplementation((async (url: string) => {
      if (url.endsWith('/request')) return { data: { status: 'sent', resend_in: 60 } }
      throw apiError(403, 'Your access request is waiting for an administrator.', 'pending_approval')
    }) as never)
    renderPage({ email: 'pat@acme.com' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))
    await user.type(await screen.findByLabelText('Digit 1 of 6'), '123456')
    expect(await screen.findByRole('alert')).toHaveTextContent('waiting for an administrator')
    expect(screen.queryByText('Home page')).not.toBeInTheDocument()
  })

  it('shows throttling and offers the password page and a different email', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(apiError(429, 'Too many attempts. Try again in 30 seconds.', 'rate_limited'))
    renderPage({ email: 'pat@acme.com' })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Email me a code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 30 seconds')
    expect(screen.getByRole('link', { name: 'Sign in with a password' })).toHaveAttribute('href', '/login')
  })

  it('can go back to change the email', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'sent', resend_in: 60 } } as never)
    renderPage({ email: 'pat@acme.com' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))
    await user.click(await screen.findByRole('button', { name: 'Use a different email' }))
    expect(screen.getByLabelText('Email')).toHaveValue('pat@acme.com')
  })

  it('moves signed-in people on', async () => {
    signedIn()
    mockGet({ '/auth/me': makeProfile('ADMIN') })
    renderPage()
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })
})

describe('ForgotPasswordPage', () => {
  const renderPage = (state?: object) =>
    renderApp(
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<Stub name="Reset page for" />} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/settings" element={<p>Settings page</p>} />
      </Routes>,
      [{ pathname: '/forgot-password', state }],
    )

  it('asks for an email and moves to the code page', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'sent', resend_in: 60 } } as never)
    renderPage()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), 'pat@acme.com')
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))
    expect(await screen.findByText('Reset page for pat@acme.com')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'pat@acme.com' })
  })

  it('carries over an email typed on the sign-in page', () => {
    renderPage({ email: 'pat@acme.com' })
    expect(screen.getByLabelText('Email')).toHaveValue('pat@acme.com')
  })

  it('validates the email and shows server errors', async () => {
    const post = vi.spyOn(api, 'post').mockRejectedValue(apiError(429, 'Wait 20 seconds before asking for another code.', 'otp_cooldown'))
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))
    expect(screen.getByText('Enter your email.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('Email'), 'pat@acme.com')
    await user.click(screen.getByRole('button', { name: 'Email me a code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Wait 20 seconds')
  })

  it('links back to sign-in', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })
})

describe('ResetPasswordPage', () => {
  const renderPage = (state: object | null = { email: 'pat@acme.com', resendIn: 60 }) =>
    renderApp(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/forgot-password" element={<p>Forgot page</p>} />
        <Route path="/login" element={<Stub name="Login page" />} />
      </Routes>,
      [{ pathname: '/reset-password', state }],
    )

  const fillPasswords = async (user: ReturnType<typeof userEvent.setup>, password = 'Brand-New-Pass9', confirm = password) => {
    await user.type(screen.getByLabelText('New password'), password)
    await user.type(screen.getByLabelText('Confirm new password'), confirm)
  }

  it('needs an email to have come from the first step', () => {
    renderPage(null)
    expect(screen.getByText('Forgot page')).toBeInTheDocument()
  })

  it('shows where the code went, without saying whether the account exists', () => {
    renderPage()
    expect(screen.getByText('pat@acme.com', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText(/If pat@acme.com has an Invento account, we’ve sent it a code/)).toBeInTheDocument()
  })

  it('keeps the button disabled until the whole code is in', async () => {
    renderPage()
    const button = screen.getByRole('button', { name: 'Reset password' })
    expect(button).toBeDisabled()
    await userEvent.setup().type(digit(1), '123')
    expect(button).toBeDisabled()
  })

  it('sets the password and returns to sign-in with a confirmation', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: undefined } as never)
    renderPage()
    const user = userEvent.setup()
    await user.type(digit(1), '482913')
    await fillPasswords(user)
    await user.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText(/Login page.*Password updated/)).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/auth/reset-password', { email: 'pat@acme.com', code: '482913', new_password: 'Brand-New-Pass9' })
  })

  it('explains a weak or mismatched password and sends nothing', async () => {
    const post = vi.spyOn(api, 'post')
    renderPage()
    const user = userEvent.setup()
    await user.type(digit(1), '482913')
    await fillPasswords(user, 'short', 'different')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))
    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByText('Passwords don’t match.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('clears the boxes when the code is wrong, but keeps the password the person typed', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(apiError(400, "That code isn't right. 4 tries left.", 'otp_invalid'))
    renderPage()
    const user = userEvent.setup()
    await user.type(digit(1), '000000')
    await fillPasswords(user)
    await user.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('4 tries left')
    expect(digit(1)).toHaveValue('')
    expect(screen.getByLabelText('New password')).toHaveValue('Brand-New-Pass9')
  })

  it('can send a new code', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'sent', resend_in: 60 } } as never)
    renderPage({ email: 'pat@acme.com', resendIn: 1 })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled(), { timeout: 2500 })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Send a new code' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'pat@acme.com' }))
    expect(await screen.findByText('We sent a new code to pat@acme.com.')).toBeInTheDocument()
  })
})
