import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { LedgerDemo } from '@/components/brand/LedgerDemo'

/** Split layout shared by sign in and sign up: form on the left, a live preview of the product on the right. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <main className="flex flex-col px-6 py-6 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Back to home" className="rounded-md">
            <Logo />
          </Link>
        </div>
        <div className="animate-rise m-auto w-full max-w-sm py-12">{children}</div>
        <nav aria-label="Legal" className="flex gap-4 text-xs text-fg-subtle">
          <Link to="/terms" className="underline-offset-4 hover:text-fg hover:underline">
            Terms
          </Link>
          <Link to="/privacy" className="underline-offset-4 hover:text-fg hover:underline">
            Privacy
          </Link>
        </nav>
      </main>
      <aside className="relative hidden items-center justify-center overflow-hidden border-l border-border bg-surface-muted p-12 lg:flex">
        <div className="animate-fade flex w-full max-w-md flex-col gap-8" style={{ '--d': 200 } as React.CSSProperties}>
          <p className="font-display text-4xl leading-tight">Every shelf, counted. Every reorder, on time.</p>
          <LedgerDemo className="animate-drift" />
        </div>
      </aside>
    </div>
  )
}
