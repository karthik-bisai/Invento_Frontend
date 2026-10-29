import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { api } from '@/api/client'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { validatePassword } from '@/lib/password'
import { useAuth } from './AuthContext'
import { AuthShell } from './AuthShell'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const STRENGTH = ['Too short', 'Okay', 'Good', 'Strong'] as const

/** 0 = under 8 characters; then +1 each for 12+ characters and for mixing letters with digits or symbols. */
function strength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0
  let s = 1
  if (pw.length >= 12) s++
  if (/[a-z]/i.test(pw) && /[^a-z]/i.test(pw)) s++
  return s as 1 | 2 | 3
}

function validate(email: string, password: string, confirm: string) {
  return {
    email: !email.trim() ? 'Enter your email.' : !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : undefined,
    password: validatePassword(password),
    confirm: confirm !== password ? 'Passwords don’t match.' : undefined,
  }
}

export function SignupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false })
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const errors = validate(email, password, confirm)
  const show = (f: keyof typeof touched) => (touched[f] ? errors[f] : undefined)
  const level = strength(password)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ email: true, password: true, confirm: true })
    if (errors.email || errors.password || errors.confirm) return
    setSubmitting(true)
    setFormError(undefined)
    try {
      const { data } = await api.post<{ email: string; email_sent: boolean; resend_in: number }>('/auth/signup', {
        email: email.trim(),
        password,
        full_name: name.trim() || undefined,
      })
      // Next stop is the code we just emailed: a page of its own, so the flow has a clear sense of progress.
      navigate('/signup/verify', { state: { email: data.email, emailSent: data.email_sent, resendIn: data.resend_in } })
    } catch (err) {
      setFormError(
        isAxiosError(err) && err.response?.status === 409
          ? 'An account with this email already exists. Try signing in instead.'
          : getErrorMessage(err, 'Unable to create your account. Please try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-5xl leading-none">Create your account</h1>
      <p className="mt-3 text-sm text-fg-muted">Choose your registration type or fill in your details below.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-surface-raised p-1 text-xs font-medium">
        <Link
          to="/signup/admin"
          className="flex items-center justify-center rounded-md px-3 py-2 text-center transition-colors hover:bg-surface text-fg"
        >
          Administrator
        </Link>
        <Link
          to="/signup/employee"
          className="flex items-center justify-center rounded-md px-3 py-2 text-center transition-colors hover:bg-surface text-fg"
        >
          Employee
        </Link>
      </div>

      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Input label="Full name (optional)" autoComplete="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <Input
          label="Work email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={show('email')}
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={show('password')}
          />
          {password && (
            <div className="flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1" aria-hidden>
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-300',
                      level >= n ? (level === 1 ? 'bg-warn-fg' : 'bg-ok-fg') : 'bg-border',
                    )}
                  />
                ))}
              </div>
              <span className="w-16 text-right text-xs text-fg-subtle">{STRENGTH[level]}</span>
            </div>
          )}
        </div>
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          error={show('confirm')}
        />
        {formError && (
          <p role="alert" className="animate-pop rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
            {formError}
          </p>
        )}
        <Button type="submit" variant="primary" loading={submitting} className="mt-1 h-10 justify-center">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-xs text-fg-subtle">
        By creating an account you agree to the{' '}
        <Link to="/terms" className="underline underline-offset-4 hover:text-fg">
          Terms
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="underline underline-offset-4 hover:text-fg">
          Privacy notice
        </Link>
        .
      </p>

      <p className="mt-4 text-sm text-fg-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
