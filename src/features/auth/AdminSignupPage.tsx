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

function strength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0
  let s = 1
  if (pw.length >= 12) s++
  if (/[a-z]/i.test(pw) && /[^a-z]/i.test(pw)) s++
  return s as 1 | 2 | 3
}

export function AdminSignupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgLocation, setOrgLocation] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    orgName: false,
    password: false,
    confirm: false,
  })
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const errors = {
    name: !name.trim() ? 'Enter your full name.' : undefined,
    email: !email.trim() ? 'Enter your work email.' : !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : undefined,
    orgName: !orgName.trim() ? 'Enter your organization name.' : undefined,
    password: validatePassword(password),
    confirm: confirm !== password ? 'Passwords don’t match.' : undefined,
  }

  const show = (f: keyof typeof touched) => (touched[f] ? errors[f] : undefined)
  const level = strength(password)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({ name: true, email: true, orgName: true, password: true, confirm: true })
    if (errors.name || errors.email || errors.orgName || errors.password || errors.confirm) return

    setSubmitting(true)
    setFormError(undefined)
    try {
      const { data } = await api.post<{
        status: string
        email: string
        email_sent: boolean
        resend_in: number
        org_code?: string
      }>('/auth/signup/admin', {
        email: email.trim(),
        password,
        full_name: name.trim(),
        organization_name: orgName.trim(),
        organization_location: orgLocation.trim() || undefined,
      })

      navigate('/signup/verify', {
        state: {
          email: data.email,
          emailSent: data.email_sent,
          resendIn: data.resend_in,
          orgCode: data.org_code,
        },
      })
    } catch (err) {
      setFormError(
        isAxiosError(err) && err.response?.status === 409
          ? 'An account with this email already exists. Try signing in instead.'
          : getErrorMessage(err, 'Unable to create your organization and account. Please try again.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
        <span>Administrator Registration</span>
      </div>
      <h1 className="mt-1 font-display text-4xl leading-tight">Create your organization</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Register as an administrator to set up your company workspace and manage warehouses, products, and employee access.
      </p>

      <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Full name"
          autoComplete="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={show('name')}
          maxLength={120}
        />

        <Input
          label="Work email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={show('email')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Organization name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, orgName: true }))}
            error={show('orgName')}
            placeholder="e.g. Acme Corp"
            maxLength={120}
          />
          <Input
            label="Location (optional)"
            value={orgLocation}
            onChange={(e) => setOrgLocation(e.target.value)}
            placeholder="e.g. New York, USA"
            maxLength={120}
          />
        </div>

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
          Create organization & verify email
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4 text-xs text-fg-muted">
        <p>
          Registering as an employee instead?{' '}
          <Link to="/signup/employee" className="font-medium text-accent underline-offset-4 hover:underline">
            Employee registration
          </Link>
        </p>
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
