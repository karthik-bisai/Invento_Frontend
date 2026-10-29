import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Building2, Camera, Check, ShieldAlert, Trash2 } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Avatar } from '@/components/layout/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'
import { shortDate } from '@/lib/format'
import { ROLE_LABELS, type User } from '@/types'
import { useRemoveAvatar, useUpdateProfile, useUploadAvatar } from './hooks'

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024
const PHONE = /^[0-9+()\-\s.]{5,32}$/

export function ProfilePage() {
  const { user } = useAuth()
  // The form seeds its fields from the user once, so only mount it when there is one.
  return user ? <ProfileView user={user} /> : null
}

function ProfileView({ user }: { user: User }) {
  const navigate = useNavigate()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice

  const update = useUpdateProfile()
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()

  const [name, setName] = useState(user?.full_name ?? '')
  const [title, setTitle] = useState(user?.job_title ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saved, setSaved] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [formError, setFormError] = useState<string>()
  const [photoError, setPhotoError] = useState<string>()
  const [preview, setPreview] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!saved) return
    const id = window.setTimeout(() => setSaved(false), 2500)
    return () => window.clearTimeout(id)
  }, [saved])

  // Free the temporary preview URL when it's replaced or the page closes.
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

  const phoneError = phone.trim() && !PHONE.test(phone.trim()) ? 'Use digits, spaces and + ( ) - . only.' : undefined
  const dirty = name.trim() !== (user.full_name ?? '') || (user.role === 'ADMIN' && title.trim() !== (user.job_title ?? '')) || phone.trim() !== (user.phone ?? '')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!dirty || phoneError) return
    setFormError(undefined)
    try {
      await update.mutateAsync({ full_name: name, job_title: user.role === 'ADMIN' ? title : (user.job_title ?? ''), phone })
      setSaved(true)
    } catch (err) {
      setFormError(getErrorMessage(err, 'We couldn’t save your profile. Please try again.'))
    }
  }

  function onVerifyEmail() {
    setVerifying(true)
    navigate('/signup/verify', { state: { email: user.email, resend: true } })
  }

  async function choose(file: File | undefined) {
    if (!file) return
    setPhotoError(undefined)
    if (!ACCEPTED.includes(file.type)) return setPhotoError('Use a PNG, JPEG or WebP image.')
    if (file.size > MAX_BYTES) return setPhotoError('That image is over 2 MB. Choose a smaller one.')
    setPreview(URL.createObjectURL(file)) // show it immediately while it uploads
    try {
      await upload.mutateAsync(file)
    } catch (err) {
      setPhotoError(getErrorMessage(err, 'We couldn’t upload that photo. Please try again.'))
    } finally {
      setPreview(undefined)
      if (input.current) input.current.value = '' // allow picking the same file again
    }
  }

  async function removePhoto() {
    setPhotoError(undefined)
    try {
      await remove.mutateAsync()
    } catch (err) {
      setPhotoError(getErrorMessage(err, 'We couldn’t remove your photo. Please try again.'))
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    void choose(e.dataTransfer.files[0])
  }

  const busyPhoto = upload.isPending || remove.isPending

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Profile" description="How you appear to your team." />

      {notice && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-ok-ring bg-ok-bg p-4 text-sm text-ok-fg">
          <Check className="size-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <section aria-label="Photo" className="h-fit rounded-lg border border-border bg-surface p-6 text-center">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn('mx-auto grid size-32 place-items-center rounded-full transition-[box-shadow,transform] duration-200', dragging && 'scale-105 ring-4 ring-accent/30')}
          >
            <div className="relative">
              <Avatar email={user.email} name={user.full_name} src={preview ?? user.avatar_url} className="size-28 text-3xl" />
              {busyPhoto && (
                <span className="absolute inset-0 grid place-items-center rounded-full bg-bg/70 backdrop-blur-[1px]" role="status">
                  <span className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <span className="sr-only">{upload.isPending ? 'Uploading photo' : 'Removing photo'}</span>
                </span>
              )}
            </div>
          </div>

          <input ref={input} type="file" accept={ACCEPTED.join(',')} className="sr-only" aria-label="Choose a photo" onChange={(e) => void choose(e.target.files?.[0])} />
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => input.current?.click()} disabled={busyPhoto}>
              <Camera className="size-3.5" aria-hidden />
              {user.avatar_url ? 'Change photo' : 'Upload photo'}
            </Button>
            {user.avatar_url && (
              <Button variant="ghost" onClick={() => void removePhoto()} disabled={busyPhoto} aria-label="Remove photo">
                <Trash2 className="size-3.5" aria-hidden />
                Remove
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-fg-subtle">PNG, JPEG or WebP, up to 2 MB. You can also drop an image here.</p>
          {photoError && (
            <p role="alert" className="animate-pop mt-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-left text-xs text-crit-fg">
              {photoError}
            </p>
          )}
        </section>

        <form onSubmit={save} noValidate aria-label="Details" className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6">
          <Input label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          <Input
            label="Job title"
            autoComplete="organization-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={user.role !== 'ADMIN'}
            maxLength={120}
            hint={user.role !== 'ADMIN' ? 'Job title is managed by your administrator.' : undefined}
          />
          <Input label="Phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={phoneError} maxLength={32} />

          {/* Email and Verification Status */}
          <div className="rounded-lg border border-border bg-surface-raised/40 p-4">
            <Input label="Email" value={user.email} disabled readOnly />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-fg-subtle">Your email is your sign-in address.</span>
              <div className="flex items-center gap-2">
                {user.email_verified !== false ? (
                  <Badge variant="success">Verified</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">Unverified</Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={onVerifyEmail}
                      loading={verifying}
                      className="h-7 text-xs"
                    >
                      Verify Email
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {user.email_verified === false && (
              <div className="mt-3 flex items-center gap-2 text-xs text-warn-fg">
                <ShieldAlert className="size-4 shrink-0" />
                <span>Please verify your email address to secure your account.</span>
              </div>
            )}
          </div>

          {/* Organizational Assignment (Read-only as per Section 13.1) */}
          <div className="rounded-lg border border-border bg-surface-raised/40 p-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                Organizational Assignment
              </span>
              <span className="text-xs text-fg-subtle">Managed by administrator</span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-fg-muted">Role</dt>
                <dd className="mt-1">
                  <Badge variant={user.role === 'ADMIN' ? 'info' : 'neutral'}>{ROLE_LABELS[user.role]}</Badge>
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-fg-muted">Job Title</dt>
                <dd className="mt-1 text-sm font-medium text-fg">
                  {user.job_title ? user.job_title : <span className="italic text-fg-subtle">Not assigned</span>}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-fg-muted">Department</dt>
                <dd className="mt-1 text-sm font-medium text-fg">
                  {user.department ? user.department : <span className="italic text-fg-subtle">Not assigned</span>}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-fg-muted">Organization</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-fg">
                  <Building2 className="size-3.5 text-accent" />
                  <span>{user.organization_name ?? 'Invento Workspace'}</span>
                  {user.org_code && (
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
                      {user.org_code}
                    </span>
                  )}
                </dd>
              </div>

              {user.created_at && (
                <div>
                  <dt className="text-xs font-medium text-fg-muted">Member since</dt>
                  <dd className="mt-1 text-sm text-fg-muted">{shortDate(user.created_at)}</dd>
                </div>
              )}
            </div>
          </div>

          {formError && (
            <p role="alert" className="animate-pop rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <span aria-live="polite" className="flex items-center gap-1.5 text-xs text-ok-fg">
              {saved && (
                <>
                  <Check className="animate-pop size-3.5" aria-hidden />
                  Saved
                </>
              )}
            </span>
            <Button type="submit" variant="primary" loading={update.isPending} disabled={!dirty || !!phoneError}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
