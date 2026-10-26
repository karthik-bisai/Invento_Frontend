import type { CSSProperties } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/cn'
import { useAuth } from './AuthContext'

const delay = (ms: number) => ({ '--d': ms }) as CSSProperties

type StepState = 'done' | 'current' | 'next'

const STEPS: { title: string; note: string; state: StepState }[] = [
  { title: 'Account created', note: 'Your details are saved.', state: 'done' },
  { title: 'Email confirmed', note: 'You proved the address is yours.', state: 'done' },
  { title: 'Waiting for an administrator', note: 'They’ve been told you’re here.', state: 'current' },
  { title: 'You’re in', note: 'We’ll email you the moment they decide.', state: 'next' },
]

/** What a new user sees after confirming their email: their request is in, and what happens next. */
export function PendingPage() {
  const { user } = useAuth()
  const email = (useLocation().state as { email?: string } | null)?.email
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="Back to home" className="rounded-md">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 pb-16 text-center">
        <div className="relative grid size-24 place-items-center" aria-hidden>
          <span className="animate-ring absolute inset-0 rounded-full bg-accent/30" />
          <span className="animate-ring absolute inset-0 rounded-full bg-accent/30" style={delay(1200)} />
          <span className="animate-pop relative grid size-20 place-items-center rounded-full bg-accent text-accent-fg shadow-float">
            <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" className="animate-draw" style={{ '--len': 24, '--d': 350 } as CSSProperties} />
            </svg>
          </span>
        </div>

        <h1 className="font-display animate-rise mt-8 text-5xl leading-none" style={delay(250)}>
          Request sent
        </h1>
        <p className="animate-rise mt-4 text-sm leading-relaxed text-fg-muted" style={delay(380)}>
          Your account is ready, but an administrator needs to approve it before you can sign in.{' '}
          {email ? (
            <>
              We’ll email <span className="font-medium text-fg">{email}</span> the moment they decide.
            </>
          ) : (
            'We’ll email you the moment they decide.'
          )}
        </p>

        <ol className="mt-10 w-full text-left" aria-label="Progress">
          {STEPS.map((step, i) => (
            <li key={step.title} className="animate-rise relative flex gap-4 pb-6 last:pb-0" style={delay(520 + i * 140)} aria-current={step.state === 'current' ? 'step' : undefined}>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn('absolute left-[0.9rem] top-8 h-[calc(100%-1.5rem)] w-px origin-top', step.state === 'done' ? 'bg-accent' : 'bg-border-strong')}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  'relative z-10 grid size-7 shrink-0 place-items-center rounded-full border text-xs',
                  step.state === 'done' && 'border-accent bg-accent text-accent-fg',
                  step.state === 'current' && 'border-accent bg-accent-soft',
                  step.state === 'next' && 'border-border-strong bg-surface',
                )}
              >
                {step.state === 'done' && <Check className="size-3.5" strokeWidth={3} />}
                {step.state === 'current' && <span className="animate-ring size-2.5 rounded-full bg-accent" />}
              </span>
              <div className="pt-0.5">
                <p className={cn('text-sm font-medium', step.state === 'next' && 'text-fg-muted')}>
                  {step.title}
                  {step.state === 'done' && <span className="sr-only"> (done)</span>}
                  {step.state === 'current' && <span className="sr-only"> (in progress)</span>}
                </p>
                <p className="text-xs text-fg-subtle">{step.note}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="animate-rise mt-10 flex flex-wrap justify-center gap-3" style={delay(1150)}>
          <Link to="/login">
            <Button variant="primary" className="h-10 px-5">
              Back to sign in
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="h-10 px-5">
              Home
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
