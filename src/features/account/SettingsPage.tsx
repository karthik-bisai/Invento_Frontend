import { useState, type FormEvent, type ReactNode } from 'react'
import { Laptop, Monitor, Moon, Smartphone, Sun } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/features/auth/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { describeDevice } from '@/lib/device'
import { timeAgo } from '@/lib/format'
import { validatePassword } from '@/lib/password'
import { DEFAULT_PREFERENCES, type DeviceSession, type ThemePreference } from '@/types'
import { useChangePassword, useRevokeOtherSessions, useRevokeSession, useSessions, useUpdatePreferences } from './hooks'

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-4 lg:grid-cols-[14rem_1fr] lg:gap-10">
      <div>
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
      </div>
      {children}
    </section>
  )
}

const Card = ({ children }: { children: ReactNode }) => <div className="divide-y divide-border rounded-lg border border-border bg-surface">{children}</div>

function PasswordForm() {
  const change = useChangePassword()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState<string>()
  const [done, setDone] = useState(false)

  const errors = {
    current: current ? undefined : 'Enter your current password.',
    next: validatePassword(next) ?? (next === current ? 'Choose a password you haven’t used here.' : undefined),
    confirm: confirm === next ? undefined : 'Passwords don’t match.',
  }
  const invalid = Object.values(errors).some(Boolean)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    setDone(false)
    if (invalid) return
    setError(undefined)
    try {
      await change.mutateAsync({ current_password: current, new_password: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      setTouched(false)
      setDone(true)
    } catch (err) {
      setError(getErrorMessage(err, 'We couldn’t change your password. Please try again.'))
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Change password" className="flex flex-col gap-4 px-5 py-5">
      <div>
        <h3 className="text-sm font-medium">Change password</h3>
        <p className="mt-0.5 text-xs text-fg-muted">Changing it signs you out everywhere else.</p>
      </div>
      <Input label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={touched ? errors.current : undefined} />
      <Input label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={touched ? errors.next : undefined} />
      <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={touched ? errors.confirm : undefined} />
      {error && (
        <p role="alert" className="animate-pop rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="animate-pop rounded-md border border-ok-ring bg-ok-bg px-3 py-2 text-xs text-ok-fg">
          Password changed. Your other devices were signed out.
        </p>
      )}
      <div>
        <Button type="submit" variant="primary" loading={change.isPending}>
          Change password
        </Button>
      </div>
    </form>
  )
}

function DeviceRow({ session, onRevoke, busy }: { session: DeviceSession; onRevoke: () => void; busy: boolean }) {
  const Icon = /Android|iOS/.test(describeDevice(session.user_agent)) ? Smartphone : Laptop
  return (
    <li className="flex items-center gap-4 px-5 py-4">
      <Icon className="size-5 shrink-0 text-fg-subtle" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {describeDevice(session.user_agent)}
          {session.current && <Badge variant="success">This device</Badge>}
        </p>
        <p className="text-xs text-fg-muted">
          {session.ip} · {session.current ? 'Active now' : `Last active ${timeAgo(session.last_seen)}`}
        </p>
      </div>
      {!session.current && (
        <Button size="sm" onClick={onRevoke} disabled={busy}>
          Sign out
        </Button>
      )}
    </li>
  )
}

function Devices() {
  const sessions = useSessions()
  const revoke = useRevokeSession()
  const revokeOthers = useRevokeOtherSessions()
  const items = sessions.data ?? []
  const others = items.filter((s) => !s.current).length

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <h3 className="text-sm font-medium">Where you’re signed in</h3>
          <p className="mt-0.5 text-xs text-fg-muted">Sign out any device you don’t recognise.</p>
        </div>
        {others > 0 && (
          <Button size="sm" onClick={() => revokeOthers.mutate()} loading={revokeOthers.isPending}>
            Sign out other devices
          </Button>
        )}
      </div>
      {sessions.isLoading ? (
        <div className="skeleton m-5 h-10 rounded" />
      ) : sessions.isError ? (
        <p role="alert" className="px-5 py-4 text-xs text-crit-fg">
          {getErrorMessage(sessions.error, 'We couldn’t load your devices.')}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((s) => (
            <DeviceRow key={s.id} session={s} onRevoke={() => revoke.mutate(s.id)} busy={revoke.isPending} />
          ))}
        </ul>
      )}
    </Card>
  )
}

export function SettingsPage() {
  const { user, hasRole } = useAuth()
  const { theme, setTheme } = useTheme()
  const update = useUpdatePreferences()
  const prefs = { ...DEFAULT_PREFERENCES, ...user?.preferences }

  const set = (patch: Parameters<typeof update.mutate>[0]) => update.mutate(patch)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12">
      <PageHeader title="Settings" description="Make the workspace work the way you do. Changes save as you make them." />

      <p role="status" aria-live="polite" className="-mt-8 h-4 text-xs text-fg-subtle">
        {update.isPending ? 'Saving…' : update.isError ? 'We couldn’t save that change, so it was undone.' : update.isSuccess ? 'All changes saved.' : ''}
      </p>

      <Section title="Appearance" description="Theme, density and motion.">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="mt-0.5 text-xs text-fg-muted">“System” follows your device and switches with it.</p>
            </div>
            <Segmented<ThemePreference>
              label="Theme"
              value={theme}
              onChange={setTheme} // PreferencesSync saves it to your account
              options={[
                { value: 'system', label: 'System', icon: Monitor },
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
              ]}
            />
          </div>
          <Switch checked={prefs.compact_tables} onChange={(v) => set({ compact_tables: v })} label="Compact tables" description="Tighter rows, so more fits on screen." />
          <Switch checked={prefs.reduce_motion} onChange={(v) => set({ reduce_motion: v })} label="Reduce motion" description="Turns off entrance animations and counting numbers." />
        </Card>
      </Section>

      <Section title="Notifications" description="What gets your attention, and where.">
        <Card>
          <Switch
            checked={prefs.notify_low_stock}
            onChange={(v) => set({ notify_low_stock: v })}
            label="Low-stock alerts"
            description="Show products below their reorder level in the bell."
          />
          {hasRole('ADMIN') && (
            <Switch
              checked={prefs.notify_email_access_requests}
              onChange={(v) => set({ notify_email_access_requests: v })}
              label="Email me about access requests"
              description="You’ll still see them in the bell and under Users."
            />
          )}
        </Card>
      </Section>

      <Section title="Security" description="Your password and the devices that can use your account.">
        <div className="flex flex-col gap-6">
          <Card>
            <PasswordForm />
          </Card>
          <Devices />
        </div>
      </Section>
    </div>
  )
}
