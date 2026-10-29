import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { getErrorCode, getErrorMessage, getRetryAfter } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useAuth } from './AuthContext'
import { AuthShell } from './AuthShell'
import { OtpInput } from './OtpInput'

interface VerifyState {
  email?: string
  /** False when the sign-up succeeded but the email didn't go out. */
  emailSent?: boolean
  resendIn?: number
  /** Arrived from a sign-in attempt on an unverified account: send a fresh code straight away. */
  resend?: boolean
}

const CODE_LENGTH = 6

export function VerifyPage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const state = (useLocation().state ?? {}) as VerifyState
  const email = state.email || user?.email

  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string | undefined>(state.emailSent === false ? 'We couldn’t send the email just now. Choose “Send a new code”.' : undefined)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)
  const [cooldown, setCooldown] = useState(state.emailSent === false || state.resend ? 0 : (state.resendIn ?? 60))
  const [sending, setSending] = useState(false)
  const autoResent = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  async function resend() {
    if (!email) return
    setSending(true)
    setError(undefined)
    setNotice(undefined)
    try {
      const { data } = await api.post<{ resend_in: number }>('/auth/resend-otp', { email })
      setCode('')
      setCooldown(data.resend_in)
      setNotice(`We sent a new code to ${email}.`)
    } catch (err) {
      const wait = getRetryAfter(err)
      if (wait) setCooldown(wait)
      setError(getErrorMessage(err, 'We couldn’t send a new code. Please try again.'))
    } finally {
      setSending(false)
    }
  }

  // Coming from a blocked sign-in, the original code is long gone: send a fresh one once, automatically.
  useEffect(() => {
    if (state.resend && email && !autoResent.current) {
      autoResent.current = true
      void resend()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function verify(value: string) {
    if (!email || busy) return
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    try {
      const { data } = await api.post<{ status: 'pending_approval' | 'approved' }>('/auth/verify-otp', { email, code: value })
      if (user) {
        await refresh()
        navigate('/profile', { replace: true, state: { notice: 'Your email address has been verified successfully.' } })
        return
      }
      if (data.status === 'approved') navigate('/login', { replace: true, state: { notice: 'Your email is confirmed and your account is ready. Sign in to continue.' } })
      else navigate('/signup/pending', { replace: true, state: { email } })
    } catch (err) {
      const kind = getErrorCode(err)
      setError(getErrorMessage(err, 'We couldn’t check that code. Please try again.'))
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
    if (next.length === CODE_LENGTH) void verify(next) // no button press needed once the last digit lands
  }

  if (user && user.email_verified) return <Navigate to="/dashboard" replace />
  if (!email) return <Navigate to="/signup" replace />

  return (
    <AuthShell>
      <h1 className="font-display text-5xl leading-none">Check your email</h1>
      <p className="mt-3 text-sm text-fg-muted">
        We sent a 6-digit code to <span className="font-medium text-fg">{email}</span>. It expires in 10 minutes.
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

      <Button variant="primary" className="mt-2 h-10 w-full justify-center" loading={busy} disabled={code.length < CODE_LENGTH} onClick={() => void verify(code)}>
        Verify email
      </Button>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={cooldown > 0 || sending}
          className="cursor-pointer font-medium text-accent underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-fg-subtle disabled:no-underline"
        >
          {sending ? 'Sending…' : cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
        </button>
        <Link to="/signup" className="underline-offset-4 hover:underline">
          Use a different email
        </Link>
      </div>
    </AuthShell>
  )
}
