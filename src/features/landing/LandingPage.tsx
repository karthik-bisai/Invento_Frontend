import type { CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { LedgerDemo } from '@/components/brand/LedgerDemo'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useAuth } from '@/features/auth/AuthContext'
import { ROLE_LABELS, type Role } from '@/types'

const YEAR = new Date().getFullYear()
const delay = (ms: number) => ({ '--d': ms }) as CSSProperties

const FEATURES = [
  {
    title: 'Counts that stay current',
    body: 'Update on-hand and reserved quantities per warehouse. Totals, value and alerts refresh the moment a count changes.',
  },
  {
    title: 'Alerts before you run out',
    body: 'Set a reorder level for each product. Low and critical stock shows up on the overview and in the alert bell.',
  },
  {
    title: 'Access that fits the job',
    body: 'Administrators, inventory managers and warehouse staff each see and change only what their role needs.',
  },
]

const ROLES: { role: Role; can: string }[] = [
  { role: 'WAREHOUSE_STAFF', can: 'Update stock counts for the products on the floor.' },
  { role: 'INVENTORY_MANAGER', can: 'Everything above, plus reorder levels, new products and warehouses, and reports.' },
  { role: 'ADMIN', can: 'Everything, including product details, deletions and who has an account.' },
]

export function LandingPage() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="animate-fade mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/signup">
            <Button variant="primary">Create account</Button>
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <h1 className="font-display text-6xl leading-[0.95] sm:text-7xl lg:text-8xl">
              <span className="animate-rise block" style={delay(100)}>
                Know what’s
              </span>{' '}
              <span className="animate-rise block" style={delay(220)}>
                on every shelf.
              </span>
            </h1>
            <p className="animate-rise mt-7 max-w-md text-lg leading-relaxed text-fg-muted" style={delay(380)}>
              Live stock across all your warehouses, with reorder alerts that arrive before the shelf is empty.
            </p>
            <div className="animate-rise mt-9 flex flex-wrap gap-3" style={delay(520)}>
              <Link to="/signup">
                <Button variant="primary" className="h-11 px-6 text-base">
                  Create account
                </Button>
              </Link>
              <Link to="/login">
                <Button className="h-11 px-6 text-base">Sign in</Button>
              </Link>
            </div>
          </div>
          <div className="animate-rise justify-self-center lg:justify-self-end" style={delay(450)}>
            <LedgerDemo className="animate-drift" />
          </div>
        </section>

        <section aria-labelledby="what" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
            <Reveal>
              <h2 id="what" className="font-display max-w-xl text-4xl leading-tight sm:text-5xl">
                Built for the people who count things.
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 120} className="md:border-l md:border-border md:px-8 md:first:border-l-0 md:first:pl-0">
                  <h3 className="font-display text-2xl leading-snug">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-fg-muted">{f.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="roles" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <h2 id="roles" className="font-display text-4xl leading-tight sm:text-5xl">
                Everyone sees what they need.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">
                New accounts start as warehouse staff. An administrator approves each one and sets its role.
              </p>
            </Reveal>
            <dl className="divide-y divide-border border-y border-border">
              {ROLES.map((r, i) => (
                <Reveal key={r.role} delay={i * 100} className="grid gap-1 py-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
                  <dt className="font-medium">{ROLE_LABELS[r.role]}</dt>
                  <dd className="text-sm leading-relaxed text-fg-muted">{r.can}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-28 sm:px-8">
          <Reveal className="rounded-xl bg-fg px-8 py-16 text-center text-bg sm:px-16">
            <h2 className="font-display mx-auto max-w-2xl text-4xl leading-tight sm:text-5xl">Ready when your next count is.</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup">
                <Button variant="primary" className="h-11 px-6 text-base">
                  Create account
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="h-11 px-6 text-base text-bg/80 hover:bg-bg/10 hover:text-bg">
                  Sign in
                </Button>
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-fg-subtle sm:px-8">
          <Logo />
          <nav aria-label="Legal" className="flex items-center gap-5">
            <Link to="/terms" className="underline-offset-4 hover:text-fg hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="underline-offset-4 hover:text-fg hover:underline">
              Privacy
            </Link>
            <span>© {YEAR} Invento</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}
