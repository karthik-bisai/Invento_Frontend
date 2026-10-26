import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from './AuthContext'
import { AuthShell } from './AuthShell'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Step one of resetting a password: say which email, and we send a code there. */
export function ForgotPasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(((useLocation().state ?? {}) as { email?: string }).email ?? '')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/settings" replace />

  const invalid = !email.trim() ? 'Enter your email.' : !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : undefined

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (invalid) return
    setBusy(true)
    setError(undefined)
    try {
      const { data } = await api.post<{ resend_in: number }>('/auth/forgot-password', { email: email.trim() })
      navigate('/reset-password', { state: { email: email.trim(), resendIn: data.resend_in } })
    } catch (err) {
      setError(getErrorMessage(err, 'We couldn’t send a code. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-5xl leading-none">Reset your password</h1>
      <p className="mt-3 text-sm text-fg-muted">Enter your email and we’ll send a 6-digit code to choose a new password.</p>

      <form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched ? invalid : undefined}
        />
        {error && (
          <p role="alert" className="animate-pop rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" loading={busy} className="mt-1 h-10 justify-center">
          Email me a code
        </Button>
      </form>

      <p className="mt-6 text-sm text-fg-muted">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}
