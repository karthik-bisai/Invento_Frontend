import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/AuthContext'
import { validatePassword } from '@/lib/password'
import { formatRoleLabel, ROLE_LABELS, type Role, type User } from '@/types'
import { useCreateUser, useUpdateUser } from './hooks'
import { useRoles } from './rolesApi'

export type UserTarget = User | 'new' | null

const DEFAULT_ROLES = Object.keys(ROLE_LABELS) as Role[]
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEPARTMENTS = [
  'Warehouse Operations',
  'Inventory Management',
  'Logistics & Shipping',
  'Procurement',
  'Quality Control',
  'Administration',
]

interface Props {
  target: UserTarget
  onClose: () => void
}

/** Admin-only user creation and edit drawer. */
export function UserDrawer({ target, onClose }: Props) {
  const { user: me } = useAuth()
  const user = target && target !== 'new' ? target : null
  const creating = target === 'new'
  const isSelf = !!user && user.id === me?.id

  const create = useCreateUser()
  const update = useUpdateUser()
  const rolesQuery = useRoles()

  const availableRoles = useMemo(() => {
    if (rolesQuery.data && rolesQuery.data.length > 0) {
      return rolesQuery.data.map((r) => ({
        value: r.name,
        label: r.name,
      }))
    }
    return DEFAULT_ROLES.map((r) => ({
      value: r,
      label: formatRoleLabel(r),
    }))
  }, [rolesQuery.data])

  const initialRole = useMemo(() => {
    if (creating) {
      const staff = availableRoles.find(
        (r) => r.value === 'WAREHOUSE_STAFF' || r.value.toLowerCase() === 'warehouse staff',
      )
      return staff ? staff.value : 'WAREHOUSE_STAFF'
    }
    if (!user?.role) return 'WAREHOUSE_STAFF'
    const match = availableRoles.find(
      (r) =>
        r.value.toLowerCase() === user.role.toLowerCase() ||
        r.value.toUpperCase().replace(/\s+/g, '_') === user.role.toUpperCase(),
    )
    return match ? match.value : user.role
  }, [creating, user?.role, availableRoles])

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [role, setRole] = useState<Role>(initialRole)
  const [jobTitle, setJobTitle] = useState(user?.job_title ?? '')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [active, setActive] = useState(user?.is_active ?? true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [createdSuccess, setCreatedSuccess] = useState(false)

  if (!target) {
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    )
  }

  const errors = {
    email: creating && !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : undefined,
    password: creating || password ? validatePassword(password) : undefined,
    confirmPassword: creating && confirmPassword && confirmPassword !== password ? 'Passwords do not match.' : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)
  const dirty =
    creating ||
    fullName.trim() !== (user?.full_name ?? '') ||
    jobTitle.trim() !== (user?.job_title ?? '') ||
    department.trim() !== (user?.department ?? '') ||
    role !== user?.role ||
    active !== user?.is_active ||
    password !== ''

  async function save() {
    setSaving(true)
    setError(undefined)
    try {
      if (user) {
        await update.mutateAsync({
          id: user.id,
          data: {
            ...(fullName.trim() !== (user.full_name ?? '') && { full_name: fullName.trim() }),
            ...(jobTitle.trim() !== (user.job_title ?? '') && { job_title: jobTitle.trim() }),
            ...(department.trim() !== (user.department ?? '') && { department: department.trim() }),
            ...(role !== user.role && { role }),
            ...(active !== user.is_active && { is_active: active }),
            ...(password && { password }),
          },
        })
        onClose()
      } else {
        await create.mutateAsync({
          email: email.trim(),
          password,
          role,
          ...(fullName.trim() && { full_name: fullName.trim() }),
          ...(jobTitle.trim() && { job_title: jobTitle.trim() }),
          ...(department.trim() && { department: department.trim() }),
        })
        setCreatedSuccess(true)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (createdSuccess) {
    return (
      <Drawer open onClose={onClose} title="Employee Created Successfully">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-ok-bg text-ok-fg">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-fg">
            Employee Created Successfully
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            The employee account has been created with the assigned role, job title, and department.
          </p>
          <div className="mt-6 w-full">
            <Button variant="primary" className="h-10 w-full justify-center" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Drawer>
    )
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={creating ? 'Create Employee User' : (user?.full_name || user!.email)}
      description={creating ? 'Add a new employee to your organization with role and department' : 'Manage employee profile, role assignments, and access'}
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
        <Input
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Alex Johnson"
        />

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={!creating}
          placeholder="e.g. alex@company.com"
          required={creating}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="user-role" className="text-xs font-medium text-fg-muted">
              Role
            </label>
            <Select id="user-role" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf}>
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="user-department" className="text-xs font-medium text-fg-muted">
              Department
            </label>
            <Select
              id="user-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <Input
          label="Job title"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Warehouse Staff, Inventory Specialist"
        />

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
              <span className="block text-xs text-fg-subtle">Inactive users cannot sign in, and active sessions terminate.</span>
            </span>
          </label>
        )}
        {isSelf && <p className="text-xs text-fg-muted">You cannot change your own role or deactivate your own account.</p>}

        <Input
          label={creating ? 'Password' : 'New password'}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={creating ? '8–72 characters.' : 'Leave blank to keep the current password.'}
        />

        {creating && (
          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
        )}

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
