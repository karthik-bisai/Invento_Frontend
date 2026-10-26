import { useState } from 'react'
import { cn } from '@/lib/cn'

interface AvatarProps {
  /** Email, used for the initials fallback. */
  email: string
  name?: string | null
  /** Profile picture URL. Falls back to initials if absent or if it fails to load. */
  src?: string | null
  className?: string
}

function initialsOf(email: string, name?: string | null) {
  const source = name?.trim() ? name.trim().split(/\s+/) : email.split('@')[0]!.split(/[._-]/)
  return (
    source
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?'
  )
}

export function Avatar({ email, name, src, className }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null)
  const showImage = !!src && failed !== src
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-xs font-semibold text-accent ring-1 ring-inset ring-accent/20',
        className,
      )}
    >
      {showImage ? (
        <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(src)} />
      ) : (
        initialsOf(email, name)
      )}
    </span>
  )
}
