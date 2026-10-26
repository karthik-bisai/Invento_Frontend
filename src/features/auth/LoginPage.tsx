import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { getErrorCode, getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { canAccess, NAV_ITEMS } from '@/components/layout/nav'
import { useAuth } from './AuthContext'
import { AuthShell } from './AuthShell'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HOME = '/dashboard'

function validate(email: string, password: string) {
  return {
    email: !email.trim() ? 'Enter your email.' : !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : undefined,
    password: !password ? 'Enter your password.' : undefined,
  }
}

export function LoginPage() {
  const { user, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const notice = (location.state as { notice?: string } | null)?.notice
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    // Return to where the user was headed, unless their role can't open it.
    const from = (location.state as { from?: string } | null)?.from ?? HOME
    const target = NAV_ITEMS.find((i) => from.startsWith(i.to))
    return <Navigate to={target && canAccess(target, user.role) ? from : HOME} replace />
  }

  const errors = validate(email, password)
  const show = (f: 'email' | 'password') => (touched[f] ? errors[f] : undefined)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (errors.email || errors.password) return
    setSubmitting(true)
    setFormError(undefined)
    try {
      await login(email.trim(), password)
    } catch (err) {
      // Someone mid-way through signing up isn't "wrong": take them to the step they still have to finish.
      const code = getErrorCode(err)
      if (code === 'email_unverified') return void navigate('/signup/verify', { state: { email: email.trim(), resend: true } })
      if (code === 'pending_approval') return void navigate('/signup/pending', { state: { email: email.trim() } })
      setFormError(
        isAxiosError(err) && err.response?.status === 401
          ? 'Incorrect email or password.'
          : getErrorMessage(err, 'Unable to sign in. Please try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-5xl leading-none">Welcome back</h1>
      <p className="mt-3 text-sm text-fg-muted">Sign in to see where your stock stands.</p>

      {notice && (
        <p role="status" className="animate-pop mt-6 rounded-md border border-ok-ring bg-ok-bg px-3 py-2 text-xs text-ok-fg">
          {notice}
        </p>
      )}

      <form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={show('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={show('password')}
        />
        <Link to="/forgot-password" state={{ email: email.trim() || undefined }} className="-mt-2 self-end text-xs font-medium text-accent underline-offset-4 hover:underline">
          Forgot password?
        </Link>
        {formError && (
          <p role="alert" className="animate-pop rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
            {formError}
          </p>
        )}
        <Button type="submit" variant="primary" loading={submitting} className="mt-1 h-10 justify-center">
          Sign in
        </Button>
        <div className="flex items-center gap-3 text-xs text-fg-subtle" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button className="h-10 justify-center" onClick={() => navigate('/login/code', { state: { email: email.trim() || undefined, from: (location.state as { from?: string } | null)?.from } })}>
          Email me a sign-in code
        </Button>
      </form>

      <p className="mt-6 text-sm text-fg-muted">
        New here?{' '}
        <Link to="/signup" className="font-medium text-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
