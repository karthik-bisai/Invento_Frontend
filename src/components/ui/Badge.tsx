import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-fg-muted ring-border-strong',
  info: 'bg-info-bg text-info-fg ring-info-ring',
  success: 'bg-ok-bg text-ok-fg ring-ok-ring',
  warning: 'bg-warn-bg text-warn-fg ring-warn-ring',
  danger: 'bg-crit-bg text-crit-fg ring-crit-ring',
}

const dots: Record<BadgeVariant, string> = {
  neutral: 'bg-fg-subtle',
  info: 'bg-info-fg',
  success: 'bg-ok-fg',
  warning: 'bg-warn-fg',
  danger: 'bg-crit-fg',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

export function Badge({ variant = 'neutral', dot = true, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[0.6875rem] font-medium ring-1 ring-inset',
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('size-1.5 rounded-full', dots[variant])} aria-hidden />}
      {children}
    </span>
  )
}
