import { cn } from '@/lib/cn'

/** The Invento mark: a box seen from above-left, in three shades. Same geometry as public/favicon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7', className)}>
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <polygon points="16 6.5 23.79 11 16 15.5 8.21 11" className="fill-accent-fg" />
      <polygon points="7.77 11.75 15.57 16.25 15.57 25.25 7.77 20.75" className="fill-accent-fg" opacity="0.72" />
      <polygon points="16.43 16.25 24.23 11.75 24.23 20.75 16.43 25.25" className="fill-accent-fg" opacity="0.5" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[0.95rem] font-semibold tracking-tight">Invento</span>
    </span>
  )
}
