import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Building2, CheckCircle2 } from 'lucide-react'
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

export interface SignupPageProps {
  initialRole?: 'admin' | 'employee'
}

export function SignupPage({ initialRole }: SignupPageProps = {}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const resolveInitialRole = (): 'admin' | 'employee' => {
    if (initialRole) return initialRole
    if (location.pathname.includes('/employee')) return 'employee'
    if (location.pathname.includes('/admin')) return 'admin'
    const qRole = searchParams.get('type') || searchParams.get('role')
    if (qRole === 'employee') return 'employee'
    return 'admin'
  }

  const [role, setRole] = useState<'admin' | 'employee'>(resolveInitialRole)

  // Shared form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  // Admin-specific fields
  const [orgName, setOrgName] = useState('')
  const [orgLocation, setOrgLocation] = useState('')

  // Employee-specific fields
  const [orgCode, setOrgCode] = useState('')
  const [validatedOrgName, setValidatedOrgName] = useState<string | null>(null)
  const [validatingOrg, setValidatingOrg] = useState(false)
  const [orgError, setOrgError] = useState<string | null>(null)
  const [employeeSubmitted, setEmployeeSubmitted] = useState(false)

  // Validation & submission state
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    orgName: false,
    orgCode: false,
    password: false,
    confirm: false,
  })
  const [formError, setFormError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const level = strength(password)

  // Validation rules depending on active tab
  const errors = {
    name: !name.trim() ? 'Enter your full name.' : undefined,
    email: !email.trim() ? 'Enter your work email.' : !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : undefined,
    orgName: role === 'admin' && !orgName.trim() ? 'Enter your organization name.' : undefined,
    orgCode: role === 'employee' ? (!orgCode.trim() ? 'Enter the Organization ID.' : (orgError ?? undefined)) : undefined,
    password: validatePassword(password),
    confirm: confirm !== password ? 'Passwords don’t match.' : undefined,
  }

  const show = (f: keyof typeof touched) => (touched[f] ? errors[f] : undefined)

  function handleTabChange(nextRole: 'admin' | 'employee') {
    if (role === nextRole) return
    setRole(nextRole)
    setFormError(undefined)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('type', nextRole)
      return next
    }, { replace: true })
  }

  async function checkOrgCode(code: string) {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setValidatedOrgName(null)
      setOrgError(null)
      return
    }
    setValidatingOrg(true)
    setOrgError(null)
    try {
      const { data } = await api.get<{ name: string; org_code: string }>(`/auth/org-lookup/${encodeURIComponent(trimmed)}`)
      setValidatedOrgName(data.name)
      setOrgError(null)
    } catch {
      setValidatedOrgName(null)
      setOrgError('Organization not found. Verify the ID with your administrator.')
    } finally {
      setValidatingOrg(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched({
      name: true,
      email: true,
      orgName: true,
      orgCode: true,
      password: true,
      confirm: true,
    })

    if (role === 'admin') {
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
    } else {
      if (errors.name || errors.email || errors.orgCode || errors.password || errors.confirm) return
      setSubmitting(true)
      setFormError(undefined)
      try {
        await api.post('/auth/signup/employee', {
          email: email.trim(),
          password,
          full_name: name.trim(),
          organization_code: orgCode.trim().toUpperCase(),
        })
        setEmployeeSubmitted(true)
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setOrgError('Invalid Organization ID. Please check the ID provided by your administrator.')
          setFormError('Organization not found. Verify the Organization ID with your administrator.')
        } else if (isAxiosError(err) && err.response?.status === 409) {
          setFormError('An account with this email already exists. Try signing in instead.')
        } else {
          setFormError(getErrorMessage(err, 'Unable to submit your registration request. Please try again.'))
        }
      } finally {
        setSubmitting(false)
      }
    }
  }

  if (employeeSubmitted) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-bg text-ok-fg">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-fg">
            Registration Request Submitted
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Your registration request has been submitted successfully. Access to the application will be granted once an administrator approves your request. You will be notified when your request is reviewed.
          </p>
          <div className="mt-8 w-full">
            <Button
              type="button"
              variant="primary"
              className="h-10 w-full justify-center"
              onClick={() => navigate('/login')}
            >
              Return to Sign In
            </Button>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Create your account</h1>
      <p className="mt-2 text-sm text-fg-muted">
        {role === 'admin'
          ? 'Register as an administrator to create your company workspace and manage warehouses, products, and employee access.'
          : 'Register with your company’s Organization ID to request workspace access. An administrator will review your request.'}
      </p>

      {/* Switch between the two registration modes without navigating to another page */}
      <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-surface-raised p-1 text-xs font-semibold sm:text-sm" role="tablist" aria-label="Registration Type">
        <button
          type="button"
          role="tab"
          aria-selected={role === 'admin'}
          onClick={() => handleTabChange('admin')}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-2 text-center transition-all',
            role === 'admin'
              ? 'bg-surface text-fg shadow-sm font-semibold'
              : 'text-fg-muted hover:text-fg hover:bg-surface/50 font-normal',
          )}
        >
          Administrator
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={role === 'employee'}
          onClick={() => handleTabChange('employee')}
          className={cn(
            'flex items-center justify-center rounded-md px-3 py-2 text-center transition-all',
            role === 'employee'
              ? 'bg-surface text-fg shadow-sm font-semibold'
              : 'text-fg-muted hover:text-fg hover:bg-surface/50 font-normal',
          )}
        >
          Employee
        </button>
      </div>

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

        {role === 'admin' ? (
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
        ) : (
          <div className="flex flex-col gap-1">
            <Input
              label="Organization ID"
              value={orgCode}
              onChange={(e) => {
                const val = e.target.value.toUpperCase()
                setOrgCode(val)
                setOrgError(null)
              }}
              onBlur={() => {
                setTouched((t) => ({ ...t, orgCode: true }))
                void checkOrgCode(orgCode)
              }}
              error={show('orgCode')}
              placeholder="e.g. ORG-A1B2C3D4"
              maxLength={30}
            />
            {validatingOrg && (
              <p className="text-xs text-fg-subtle">Checking organization...</p>
            )}
            {validatedOrgName && !orgError && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-ok-fg">
                <Building2 className="h-3.5 w-3.5" />
                <span>{validatedOrgName}</span>
              </div>
            )}
          </div>
        )}

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
          {role === 'admin' ? 'Create organization & verify email' : 'Submit registration request'}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-fg-muted">
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

      <div className="mt-4 border-t border-border pt-4 text-center text-xs text-fg-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </div>
    </AuthShell>
  )
}
