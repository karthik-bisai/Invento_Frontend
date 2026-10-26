import type { CSSProperties } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'
import { canAccess, NAV_ITEMS } from './nav'

/**
 * Primary navigation: a floating dock pinned to the bottom of the viewport.
 * The active destination expands to show its label; the others stay icon-only
 * and name themselves on hover or focus.
 */
export function Dock() {
  const { user } = useAuth()
  const items = NAV_ITEMS.filter((i) => canAccess(i, user?.role))

  return (
    <nav aria-label="Primary" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-6">
      <ul
        className="animate-rise pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-surface/80 p-1.5 shadow-float backdrop-blur-xl"
        style={{ '--d': 250 } as CSSProperties}
      >
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-11 items-center rounded-full px-3 transition-[background-color,color,transform,padding] duration-300',
                  isActive
                    ? 'bg-fg px-4 text-bg'
                    : 'text-fg-muted hover:-translate-y-0.5 hover:bg-surface-hover hover:text-fg active:scale-95',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-[1.15rem] shrink-0" aria-hidden />
                  {/* grid 0fr -> 1fr animates the label's width without measuring it */}
                  <span
                    aria-hidden
                    className={cn(
                      'grid transition-[grid-template-columns,opacity,margin] duration-300 ease-out',
                      isActive ? 'ml-2 grid-cols-[1fr] opacity-100' : 'ml-0 grid-cols-[0fr] opacity-0',
                    )}
                  >
                    <span className="overflow-hidden whitespace-nowrap text-sm font-medium">{label}</span>
                  </span>
                  {!isActive && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-xs font-medium text-bg opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                    >
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
