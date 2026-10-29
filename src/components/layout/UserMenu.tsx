import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { displayName, ROLE_LABELS } from '@/types'
import { Avatar } from './Avatar'

const item =
  'flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex size-11 cursor-pointer items-center justify-center rounded-full transition-[background-color,transform] duration-150 hover:bg-surface-hover hover:scale-105 active:scale-95"
      >
        <Avatar email={user.email} name={user.full_name} src={user.avatar_url} />
      </button>
      {open && (
        <div
          role="region"
          aria-label="Account"
          className="animate-pop absolute right-0 bottom-full z-50 mb-3 w-64 origin-bottom-right overflow-hidden rounded-xl border border-border bg-surface shadow-pop"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar email={user.email} name={user.full_name} src={user.avatar_url} className="size-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName(user)}</p>
              <p className="truncate text-xs text-fg-muted">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <div className="border-t border-border">
            <Link to="/profile" onClick={() => setOpen(false)} className={item}>
              <UserRound className="size-4" aria-hidden />
              Profile
            </Link>
            <Link to="/settings" onClick={() => setOpen(false)} className={item}>
              <Settings className="size-4" aria-hidden />
              Settings
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              void logout()
            }}
            className={`${item} border-t border-border`}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
