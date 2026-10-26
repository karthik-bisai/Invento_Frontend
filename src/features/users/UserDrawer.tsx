import { useState } from 'react'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/AuthContext'
import { validatePassword } from '@/lib/password'
import { ROLE_LABELS, type Role, type User } from '@/types'
import { useCreateUser, useUpdateUser } from './hooks'

export type UserTarget = User | 'new' | null

const ROLES = Object.keys(ROLE_LABELS) as Role[]
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  target: UserTarget
  onClose: () => void
}

/** Admin-only. You can't demote or deactivate your own account (the API refuses it too). Mount with a per-record `key`. */
export function UserDrawer({ target, onClose }: Props) {
  const { user: me } = useAuth()
  const user = target && target !== 'new' ? target : null
  const creating = target === 'new'
  const isSelf = !!user && user.id === me?.id

  const create = useCreateUser()
  const update = useUpdateUser()

  const [email, setEmail] = useState(user?.email ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'WAREHOUSE_STAFF')
  const [active, setActive] = useState(user?.is_active ?? true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  if (!target) {
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    )
  }

  const errors = {
    email: creating && !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : undefined,
    password:
      creating || password ? validatePassword(password) : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)
  const dirty = creating || role !== user?.role || active !== user?.is_active || password !== ''

  async function save() {
    setSaving(true)
    setError(undefined)
    try {
      if (user) {
        await update.mutateAsync({
          id: user.id,
          data: {
            ...(role !== user.role && { role }),
            ...(active !== user.is_active && { is_active: active }),
            ...(password && { password }),
          },
        })
      } else {
        await create.mutateAsync({ email: email.trim(), password, role })
      }
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={creating ? 'New user' : user!.email}
      description={creating ? 'Create an account and choose its role' : 'Change role, access or password'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} disabled={!dirty || invalid} onClick={save}>
            {creating ? 'Create user' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (dirty && !invalid) void save()
        }}
      >
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} disabled={!creating} />

        <div className="flex flex-col gap-1">
          <label htmlFor="user-role" className="text-xs font-medium text-fg-muted">
            Role
          </label>
          <Select id="user-role" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>

        {!creating && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={isSelf}
            />
            <span>
              Active
              <span className="block text-xs text-fg-subtle">Inactive users can’t sign in, and existing sessions stop working.</span>
            </span>
          </label>
        )}
        {isSelf && <p className="text-xs text-fg-muted">You can’t change your own role or deactivate your own account.</p>}

        <Input
          label={creating ? 'Password' : 'New password'}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={creating ? '8–72 characters.' : 'Leave blank to keep the current password.'}
        />

        {error && (
          <p role="alert" className="rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
            {error}
          </p>
        )}
        <button type="submit" className="sr-only" tabIndex={-1}>
          Save
        </button>
      </form>
    </Drawer>
  )
}
