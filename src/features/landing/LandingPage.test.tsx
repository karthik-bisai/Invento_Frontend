import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { makeUser, mockGet, signedIn } from '@/test/mockApi'
import { renderApp } from '@/test/render'
import { LandingPage } from './LandingPage'

const renderLanding = () =>
  renderApp(
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<p>Home page</p>} />
    </Routes>,
  )

describe('LandingPage', () => {
  it('invites visitors to create an account or sign in', () => {
    renderLanding()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Know what’s on every shelf.')
    expect(screen.getAllByRole('link', { name: 'Create account' })[0]).toHaveAttribute('href', '/signup')
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute('href', '/login')
  })

  it('describes what each role can do', () => {
    renderLanding()
    for (const role of ['Warehouse Staff', 'Inventory Manager', 'Administrator']) {
      expect(screen.getByText(role)).toBeInTheDocument()
    }
  })

  it('sends signed-in users straight to their overview', async () => {
    signedIn()
    mockGet({ '/auth/me': makeUser('ADMIN') })
    renderLanding()
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })
})
