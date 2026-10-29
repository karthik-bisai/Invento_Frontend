import type { CSSProperties } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  Layers,
  Package,
  ShieldCheck,
  TrendingUp,
  Warehouse,
} from 'lucide-react'
import { LedgerDemo } from '@/components/brand/LedgerDemo'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { useAuth } from '@/features/auth/AuthContext'
import { ROLE_LABELS, type Role } from '@/types'

const YEAR = new Date().getFullYear()
const delay = (ms: number) => ({ '--d': ms }) as CSSProperties

const FEATURES = [
  {
    icon: Boxes,
    title: 'Centralized Inventory Operations',
    body: 'Maintain live, accurate stock levels across all your warehouses. On-hand, reserved, and available counts update instantly across every location.',
  },
  {
    icon: Warehouse,
    title: 'Multi-Warehouse Transfers',
    body: 'Coordinate stock movements between facilities with clear status tracking and full audit trails to prevent discrepancies.',
  },
  {
    icon: Layers,
    title: 'Automated Stock Alerts',
    body: 'Configurable reorder thresholds trigger real-time alerts and inbox notifications before items run out of stock.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access Control',
    body: 'Enforce organization boundaries and granular permissions tailored for administrators, inventory managers, and floor staff.',
  },
  {
    icon: BarChart3,
    title: 'Operational Reporting',
    body: 'Analyze inventory turnover, stock valuations, and replenishment schedules with real-time operational insights.',
  },
  {
    icon: Building2,
    title: 'Multi-Tenant & Configurable Currency',
    body: 'Dedicated organization codes, secure tenant isolation, and custom currency configurations (USD, INR, EUR, GBP, AED, SAR, CAD, AUD).',
  },
]

const ROLES: { role: Role; can: string }[] = [
  { role: 'WAREHOUSE_STAFF', can: 'Floor-level stock counting, on-hand adjustments, and daily verification.' },
  { role: 'INVENTORY_MANAGER', can: 'Reorder levels, catalog additions, multi-warehouse coordination, and operational reports.' },
  { role: 'ADMIN', can: 'Full organizational authority, employee approvals, user roles, security, and currency configuration.' },
]

export function LandingPage() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      {/* Top Header */}
      <header className="animate-fade mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 sm:px-10 lg:px-12 xl:px-16">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/signup">
            <Button variant="primary">Create account</Button>
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="mx-auto grid w-full max-w-[1440px] items-center gap-12 px-6 pb-24 pt-12 sm:px-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:pt-20 xl:px-16 xl:gap-20">
          <div>
            <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-fg-muted" style={delay(50)}>
              <span className="size-2 rounded-full bg-accent" />
              Enterprise Warehouse & Inventory Intelligence
            </div>

            <h1 className="font-display mt-6 text-5xl leading-[1.04] sm:text-6xl lg:text-7xl xl:text-8xl">
              <span className="animate-rise inline" style={delay(120)}>
                Know what’s{' '}
              </span>
              <span className="animate-rise inline text-accent" style={delay(240)}>
                on every shelf.
              </span>
            </h1>

            <p className="animate-rise mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted sm:text-xl lg:max-w-3xl" style={delay(380)}>
              Live inventory tracking across all facilities, automated low-stock warnings, and tenant-isolated operations for modern warehousing teams.
            </p>

            {/* Registration & Sign In CTAs */}
            <div className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={delay(500)}>
              <Link to="/signup/admin" className="flex-1 sm:flex-initial">
                <Button variant="primary" className="h-11 w-full px-5 text-sm font-semibold sm:w-auto">
                  Register as Administrator
                  <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </Link>
              <Link to="/signup/employee" className="flex-1 sm:flex-initial">
                <Button variant="secondary" className="h-11 w-full px-5 text-sm font-medium sm:w-auto">
                  Register as Employee
                </Button>
              </Link>
              <Link to="/login" className="flex-1 sm:flex-initial">
                <Button variant="secondary" className="h-11 w-full px-5 text-sm font-medium sm:w-auto">
                  Sign in
                </Button>
              </Link>
            </div>

            <div className="animate-rise mt-8 flex flex-wrap items-center gap-6 text-xs text-fg-subtle sm:text-sm" style={delay(600)}>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-ok-fg" />
                Multi-Tenant Isolation
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-ok-fg" />
                Configurable Currencies
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-ok-fg" />
                Role-Based Approval
              </span>
            </div>
          </div>

          <div className="animate-rise justify-self-center lg:justify-self-end w-full flex justify-center lg:justify-end" style={delay(450)}>
            <LedgerDemo className="animate-drift shadow-2xl w-full max-w-md lg:max-w-lg" />
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section aria-labelledby="features" className="border-y border-border bg-surface">
          <div className="mx-auto w-full max-w-[1440px] px-6 py-20 sm:px-10 lg:px-12 xl:px-16">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">Comprehensive Platform</span>
              <h2 id="features" className="font-display mt-2 max-w-2xl text-3xl leading-tight sm:text-4xl lg:text-5xl">
                Eliminate manual guesswork from your supply chain.
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-fg-muted sm:text-lg">
                Replace fragmented spreadsheets with a synchronized ledger designed for warehouse staff, logistics managers, and executive leadership.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <Reveal key={f.title} delay={i * 80} className="rounded-xl border border-border bg-bg/50 p-6 transition-all hover:border-accent/40 hover:bg-surface">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-display mt-4 text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-fg-muted">{f.body}</p>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* Roles & Operational Governance Section */}
        <section aria-labelledby="roles" className="mx-auto w-full max-w-[1440px] px-6 py-20 sm:px-10 lg:px-12 xl:px-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-wider text-accent">Access Governance</span>
              <h2 id="roles" className="font-display mt-2 text-3xl leading-tight sm:text-4xl">
                Everyone sees what they need.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-fg-muted sm:text-base">
                Employee self-registration requests require administrator review. Assign precise designations and departments to protect operational integrity.
              </p>
              <div className="mt-6">
                <Link to="/signup/employee">
                  <Button variant="ghost" className="text-accent hover:bg-accent-soft">
                    Request employee access
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Button>
                </Link>
              </div>
            </Reveal>

            <dl className="divide-y divide-border rounded-xl border border-border bg-surface p-6 shadow-sm">
              {ROLES.map((r, i) => (
                <Reveal key={r.role} delay={i * 100} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6 first:pt-0 last:pb-0">
                  <dt className="font-medium text-fg">{ROLE_LABELS[r.role]}</dt>
                  <dd className="text-xs leading-relaxed text-fg-muted">{r.can}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="mx-auto w-full max-w-[1440px] px-6 pb-24 sm:px-10 lg:px-12 xl:px-16">
          <Reveal className="rounded-2xl border border-border bg-surface-muted px-8 py-16 text-center sm:px-16">
            <h2 className="font-display mx-auto max-w-3xl text-3xl leading-tight sm:text-4xl lg:text-5xl">
              Ready to streamline your warehouse operations?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-fg-muted sm:text-lg">
              Get your organization set up in minutes with automated stock tracking and real-time alerts.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/signup/admin">
                <Button variant="primary" className="h-11 px-6 text-sm font-semibold">
                  Register as Administrator
                </Button>
              </Link>
              <Link to="/signup/employee">
                <Button variant="secondary" className="h-11 px-6 text-sm font-medium">
                  Register as Employee
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" className="h-11 px-6 text-sm font-medium">
                  Sign in
                </Button>
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-fg-subtle sm:px-10 lg:px-12 xl:px-16">
          <Logo />
          <nav aria-label="Legal" className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-fg hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-fg hover:underline">
              Privacy
            </Link>
            <span>© {YEAR} Invento Systems Inc. All rights reserved.</span>
          </nav>
        </div>
      </footer>
    </div>
  )
}

