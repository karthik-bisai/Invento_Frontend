import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { api } from '@/api/client'
import { getErrorCode, getErrorMessage, getRetryAfter } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { canAccess, NAV_ITEMS } from '@/components/layout/nav'
import { cn } from '@/lib/cn'
import { useAuth } from './AuthContext'
import { AuthShell } from './AuthShell'
import { OtpInput } from './OtpInput'
import { ResendButton } from './ResendButton'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HOME = '/dashboard'
const LENGTH = 6

interface SentResult {
  resend_in: number
}

/** Sign in without a password: we email a 6-digit code, and typing it in is the sign-in. */
export function CodeSignInPage() {
  const { user, completeLogin } = useAuth()
  const location = useLocation()
  const state = (location.state ?? {}) as { email?: string; from?: string }
  const [email, setEmail] = useState(state.email ?? '')
  const [phase, setPhase] = useState<'email' | 'code'>('email')
  const [resendIn, setResendIn] = useState(60)
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)

  if (user) {
    const from = state.from ?? HOME
    const target = NAV_ITEMS.find((i) => from.startsWith(i.to))
    return <Navigate to={target && canAccess(target, user.role) ? from : HOME} replace />
  }

  const emailError = !email.trim() ? 'Enter your email.' : !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : undefined

  /** Returns the next cooldown so a ResendButton can use the same call. */
  async function sendCode(): Promise<number | undefined> {
    setError(undefined)
    try {
      const { data } = await api.post<SentResult>('/auth/login-code/request', { email: email.trim() })
      setResendIn(data.resend_in)
      setCode('')
      return data.resend_in
    } catch (err) {
      setError(getErrorMessage(err, 'We couldn’t send a code. Please try again.'))
      return undefined
    }
  }

  async function onSend(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (emailError) return
    setBusy(true)
    const ok = await sendCode()
    setBusy(false)
    if (ok !== undefined) {
      setNotice(`If ${email.trim()} has an Invento account, we’ve sent it a code.`)
      setPhase('code')
    }
  }

  async function verify(value: string) {
    if (busy) return
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    try {
      await api.post('/auth/login-code/verify', { email: email.trim(), code: value })
      await completeLogin() // the user is set, so the redirect above takes over
    } catch (err) {
      setError(getErrorMessage(err, 'We couldn’t check that code. Please try again.'))
      const kind = getErrorCode(err)
      if (kind === 'otp_invalid' || kind === 'otp_locked' || kind === 'otp_expired') {
        setCode('')
        setShake((n) => n + 1)
      }
    } finally {
      setBusy(false)
    }
  }

  function change(next: string) {
    setCode(next)
    setError(undefined)
    if (next.length === LENGTH) void verify(next)
  }

  if (phase === 'code') {
    return (
      <AuthShell>
        <h1 className="font-display text-5xl leading-none">Check your email</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Enter the 6-digit code we sent to <span className="font-medium text-fg">{email.trim()}</span>. It expires in 10 minutes.
        </p>

        <div key={shake} className={cn('mt-8', shake > 0 && 'animate-shake')}>
          <OtpInput value={code} onChange={change} disabled={busy} invalid={!!error} autoFocus />
        </div>

        <div className="mt-4 min-h-10" aria-live="polite">
          {error && (
            <p role="alert" className="animate-pop rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
              {error}
            </p>
          )}
          {!error && notice && <p className="animate-pop rounded-md border border-ok-ring bg-ok-bg px-3 py-2 text-xs text-ok-fg">{notice}</p>}
        </div>

        <Button variant="primary" className="mt-2 h-10 w-full justify-center" loading={busy} disabled={code.length < LENGTH} onClick={() => void verify(code)}>
          Sign in
        </Button>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
          <ResendButton initial={resendIn} onResend={sendCode} />
          <button type="button" onClick={() => setPhase('email')} className="cursor-pointer underline-offset-4 hover:underline">
            Use a different email
          </button>
          <Link to="/login" className="underline-offset-4 hover:underline">
            Use a password
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="font-display text-5xl leading-none">Sign in with a code</h1>
      <p className="mt-3 text-sm text-fg-muted">No password needed. We’ll email you a 6-digit code.</p>

      <form noValidate onSubmit={onSend} className="mt-8 flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          error={touched ? emailError : undefined}
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
        Prefer a password?{' '}
        <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Sign in with a password
        </Link>
      </p>
    </AuthShell>
  )
}
