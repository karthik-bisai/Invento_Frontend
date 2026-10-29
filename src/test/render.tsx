import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, type InitialEntry } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'

/** Real providers (query cache, auth, router) with retries off so failures surface immediately. */
export function renderApp(ui: ReactNode, initialEntries: InitialEntry[] = ['/']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
