import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { api } from '@/api/client'
import { apiError } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import { VerifyPage } from './VerifyPage'

function Pending() {
  return <p>Pending page for {(useLocation().state as { email: string }).email}</p>
}
function Login() {
  return <p>Login: {(useLocation().state as { notice: string }).notice}</p>
}

function renderVerify(state: object | null = { email: 'nia@acme.com', resendIn: 60 }) {
  return renderApp(
    <Routes>
      <Route path="/signup/verify" element={<VerifyPage />} />
      <Route path="/signup/pending" element={<Pending />} />
      <Route path="/signup" element={<p>Signup page</p>} />
      <Route path="/login" element={<Login />} />
    </Routes>,
    [{ pathname: '/signup/verify', state }],
  )
}

const digit = (n: number) => screen.getByLabelText(`Digit ${n} of 6`)

describe('VerifyPage', () => {
  it('asks for the code that was emailed and shows where it went', () => {
    renderVerify()
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText('nia@acme.com')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Verification code' })).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Digit \d of 6/)).toHaveLength(6)
  })

  it('checks the code by itself as soon as the sixth digit is typed, then shows the pending page', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'pending_approval' } } as never)
    renderVerify()
    const user = userEvent.setup()

    await user.type(digit(1), '482913') // focus advances box to box

    expect(await screen.findByText('Pending page for nia@acme.com')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/auth/verify-otp', { email: 'nia@acme.com', code: '482913' })
  })

  it('accepts a pasted code', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'pending_approval' } } as never)
    renderVerify()
    await userEvent.setup().click(digit(1))
    await userEvent.paste('12 34-56')
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/verify-otp', { email: 'nia@acme.com', code: '123456' }))
  })

  it('ignores anything that is not a digit', async () => {
    renderVerify()
    await userEvent.setup().type(digit(1), 'ab1c')
    expect(digit(1)).toHaveValue('1')
    expect(digit(2)).toHaveValue('')
  })

  it('lets backspace step back through the boxes', async () => {
    renderVerify()
    const user = userEvent.setup()
    await user.type(digit(1), '123')
    await user.keyboard('{Backspace}')
    expect(digit(3)).toHaveValue('')
    await user.keyboard('{Backspace}')
    expect(digit(2)).toHaveValue('')
    expect(digit(1)).toHaveValue('1')
  })

  it('shows a wrong-code error, clears the boxes and stays put', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(apiError(400, "That code isn't right. 4 tries left.", 'otp_invalid'))
    renderVerify()
    await userEvent.setup().type(digit(1), '000000')

    expect(await screen.findByRole('alert')).toHaveTextContent('4 tries left')
    expect(digit(1)).toHaveValue('')
    expect(digit(1)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(/Pending page/)).not.toBeInTheDocument()
  })

  it('sends people whose email is verified and account is active straight to sign-in', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'approved' } } as never)
    renderVerify()
    await userEvent.setup().type(digit(1), '111111')
    expect(await screen.findByText(/Login: Your email is confirmed/)).toBeInTheDocument()
  })

  it('keeps "Verify email" disabled until all six digits are in', async () => {
    renderVerify()
    const button = screen.getByRole('button', { name: 'Verify email' })
    expect(button).toBeDisabled()
    await userEvent.setup().type(digit(1), '123')
    expect(button).toBeDisabled()
  })

  describe('resending', () => {
    it('counts down before another code can be requested', () => {
      renderVerify({ email: 'nia@acme.com', resendIn: 45 })
      expect(screen.getByRole('button', { name: 'Send a new code in 45s' })).toBeDisabled()
    })

    it('sends a new code on request and starts a fresh countdown', async () => {
      const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'sent', resend_in: 60 } } as never)
      renderVerify({ email: 'nia@acme.com', emailSent: false })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Send a new code' }))

      expect(await screen.findByText('We sent a new code to nia@acme.com.')).toBeInTheDocument()
      expect(post).toHaveBeenCalledWith('/auth/resend-otp', { email: 'nia@acme.com' })
      expect(screen.getByRole('button', { name: 'Send a new code in 60s' })).toBeDisabled()
    })

    it('tells you plainly when the first email never went out', () => {
      renderVerify({ email: 'nia@acme.com', emailSent: false })
      expect(screen.getByText(/couldn’t send the email/)).toBeInTheDocument()
    })

    it('sends a fresh code by itself when arriving from a blocked sign-in', async () => {
      const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'sent', resend_in: 60 } } as never)
      renderVerify({ email: 'nia@acme.com', resend: true })
      await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/resend-otp', { email: 'nia@acme.com' }))
      expect(post).toHaveBeenCalledTimes(1)
    })

    it('honours the server’s cooldown if it refuses', async () => {
      vi.spyOn(api, 'post').mockRejectedValue(apiError(429, 'Wait 30 seconds before asking for another code.', 'otp_cooldown', { 'retry-after': '30' }))
      renderVerify({ email: 'nia@acme.com', emailSent: false })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Send a new code' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Wait 30 seconds')
      expect(screen.getByRole('button', { name: 'Send a new code in 30s' })).toBeDisabled()
    })
  })

  it('goes back to sign-up when there is no email to verify', () => {
    renderVerify(null)
    expect(screen.getByText('Signup page')).toBeInTheDocument()
  })
})
