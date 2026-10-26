import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { httpError, mockPost } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import { LoginPage } from './LoginPage'

function Landed({ name }: { name: string }) {
  const state = useLocation().state as { email?: string; resend?: boolean } | null
  return (
    <p>
      {name} for {state?.email} {state?.resend ? '(resend)' : ''}
    </p>
  )
}

async function submit() {
  renderApp(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup/verify" element={<Landed name="Verify page" />} />
      <Route path="/signup/pending" element={<Landed name="Pending page" />} />
    </Routes>,
    ['/login'],
  )
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), 'pat@acme.com')
  await user.type(screen.getByLabelText('Password'), 'secret-pass')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

/** FastAPI/gateway error shape: a message plus a machine code. */
const refusal = (status: number, detail: string, code: string) => Object.assign(httpError(status, detail), { response: { status, data: { detail, code }, headers: {} } })

describe('LoginPage account stages', () => {
  it('sends someone who never confirmed their email to the code page, asking for a fresh code', async () => {
    mockPost({}).mockRejectedValue(refusal(403, 'Verify your email to continue.', 'email_unverified'))
    await submit()
    expect(await screen.findByText('Verify page for pat@acme.com (resend)')).toBeInTheDocument()
  })

  it('sends someone awaiting approval to the status page instead of showing an error', async () => {
    mockPost({}).mockRejectedValue(refusal(403, 'Your access request is waiting for an administrator.', 'pending_approval'))
    await submit()
    expect(await screen.findByText('Pending page for pat@acme.com')).toBeInTheDocument()
  })

  it('explains a declined or deactivated account in place', async () => {
    mockPost({}).mockRejectedValue(refusal(403, 'Your access request was declined.', 'rejected'))
    await submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Your access request was declined.')
    expect(screen.queryByText(/Pending page/)).not.toBeInTheDocument()
  })
})

describe('LoginPage server refusals', () => {
  it('shows how long to wait when the server throttles sign-in', async () => {
    mockPost({}).mockRejectedValue(refusal(429, 'Too many attempts. Try again in 42 seconds.', 'rate_limited'))
    await submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 42 seconds')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('falls back to a generic wait message if a throttle response has no detail', async () => {
    mockPost({}).mockRejectedValue(httpError(429))
    await submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts')
  })

  it('shows a notice passed from the verification step', async () => {
    renderApp(<LoginPage />, [{ pathname: '/login', state: { notice: 'Your email is confirmed.' } }])
    expect(screen.getByRole('status')).toHaveTextContent('Your email is confirmed.')
  })
})
