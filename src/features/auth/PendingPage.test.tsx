import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import { PendingPage } from './PendingPage'

const renderPending = (state?: object) =>
  renderApp(
    <Routes>
      <Route path="/signup/pending" element={<PendingPage />} />
      <Route path="/dashboard" element={<p>Home page</p>} />
    </Routes>,
    [{ pathname: '/signup/pending', state }],
  )

describe('PendingPage', () => {
  it('tells the new user their request is sent and names the address we will write to', () => {
    renderPending({ email: 'nia@acme.com' })
    expect(screen.getByRole('heading', { level: 1, name: 'Request sent' })).toBeInTheDocument()
    expect(screen.getByText(/needs to approve it before you can sign in/)).toBeInTheDocument()
    expect(screen.getByText('nia@acme.com')).toBeInTheDocument()
  })

  it('still reads well when opened without an email', () => {
    renderPending()
    expect(screen.getByText(/needs to approve it before you can sign in/).textContent).toContain('We’ll email you the moment they decide')
  })

  it('lays out the journey with the current step marked for assistive tech', () => {
    renderPending({ email: 'nia@acme.com' })
    const steps = within(screen.getByRole('list', { name: 'Progress' })).getAllByRole('listitem')
    expect(steps.map((s) => s.textContent)).toEqual([
      expect.stringContaining('Account created'),
      expect.stringContaining('Email confirmed'),
      expect.stringContaining('Waiting for an administrator'),
      expect.stringContaining('You’re in'),
    ])
    expect(steps.filter((s) => s.getAttribute('aria-current') === 'step')).toHaveLength(1)
    expect(steps[2]).toHaveAttribute('aria-current', 'step')
    expect(within(steps[0] as HTMLElement).getByText('(done)')).toBeInTheDocument()
  })

  it('links back to sign-in', () => {
    renderPending()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })

  it('moves signed-in users on to their overview', async () => {
    signedIn()
    mockGet({ '/auth/me': makeUser('ADMIN') })
    renderPending()
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })
})
