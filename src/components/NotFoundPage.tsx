import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthContext'

/** Shown for any address that doesn't exist. Signed-in people are offered their overview, everyone else the home page. */
export function NotFoundPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="Back to home" className="rounded-md">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 pb-24 text-center">
        <p aria-hidden className="font-display animate-rise text-8xl leading-none text-accent">
          404
        </p>
        <h1 className="font-display animate-rise mt-6 text-4xl leading-tight" style={{ '--d': 120 } as React.CSSProperties}>
          We can’t find that page
        </h1>
        <p className="animate-rise mt-3 text-sm text-fg-muted" style={{ '--d': 220 } as React.CSSProperties}>
          The link may be old or mistyped, or the page may have moved.
        </p>
        <div className="animate-rise mt-8 flex flex-wrap justify-center gap-3" style={{ '--d': 320 } as React.CSSProperties}>
          <Link to={user ? '/dashboard' : '/'}>
            <Button variant="primary" className="h-10 px-5">
              {user ? 'Go to overview' : 'Go to home'}
            </Button>
          </Link>
          <Button className="h-10 px-5" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </main>
    </div>
  )
}
