import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { getErrorCode, getErrorMessage, getRetryAfter } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { validatePassword } from '@/lib/password'
import { useAuth } from './AuthContext'
import { AuthShell } from './AuthShell'
import { OtpInput } from './OtpInput'
import { ResendButton } from './ResendButton'

const LENGTH = 6

/** Step two: the emailed code plus the new password. Success ends every other session and returns to sign-in. */
export function ResetPasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const state = (useLocation().state ?? {}) as { email?: string; resendIn?: number }
  const email = state.email

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string | undefined>(email ? `If ${email} has an Invento account, we’ve sent it a code.` : undefined)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)

  if (user) return <Navigate to="/settings" replace />
  if (!email) return <Navigate to="/forgot-password" replace />

  const errors = {
    password: validatePassword(password),
    confirm: confirm === password ? undefined : 'Passwords don’t match.',
  }
  const ready = code.length === LENGTH && !errors.password && !errors.confirm

  async function resend(): Promise<number | undefined> {
    setError(undefined)
    try {
      const { data } = await api.post<{ resend_in: number }>('/auth/forgot-password', { email })
      setCode('')
      setNotice(`We sent a new code to ${email}.`)
      return data.resend_in
    } catch (err) {
      setError(getErrorMessage(err, 'We couldn’t send a new code. Please try again.'))
      return getRetryAfter(err)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!ready || busy) return
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    try {
      await api.post('/auth/reset-password', { email, code, new_password: password })
      navigate('/login', { replace: true, state: { notice: 'Password updated. Sign in with your new password.' } })
    } catch (err) {
      setError(getErrorMessage(err, 'We couldn’t reset your password. Please try again.'))
      const kind = getErrorCode(err)
      if (kind === 'otp_invalid' || kind === 'otp_locked' || kind === 'otp_expired') {
        setCode('')
        setShake((n) => n + 1)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="font-display text-5xl leading-none">Choose a new password</h1>
      <p className="mt-3 text-sm text-fg-muted">
        Enter the 6-digit code we sent to <span className="font-medium text-fg">{email}</span>, then your new password.
      </p>

      <form noValidate onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <div key={shake} className={cn(shake > 0 && 'animate-shake')}>
          <OtpInput value={code} onChange={(v) => { setCode(v); setError(undefined) }} disabled={busy} invalid={!!error && /code/i.test(error)} autoFocus />
        </div>
        <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={touched ? errors.password : undefined} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={touched ? errors.confirm : undefined} />

        <div className="min-h-6" aria-live="polite">
          {error && (
            <p role="alert" className="animate-pop rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
              {error}
            </p>
          )}
          {!error && notice && <p className="animate-pop rounded-md border border-ok-ring bg-ok-bg px-3 py-2 text-xs text-ok-fg">{notice}</p>}
        </div>

        <Button type="submit" variant="primary" loading={busy} disabled={code.length < LENGTH} className="h-10 justify-center">
          Reset password
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
        <ResendButton initial={state.resendIn ?? 60} onResend={resend} />
        <Link to="/login" className="underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  )
}
