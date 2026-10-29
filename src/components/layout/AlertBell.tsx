import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Check, CheckCheck, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthContext'
import { useLowStock } from '@/features/inventory/hooks'
import { StockBadge } from '@/features/inventory/stock'
import { NotificationModal } from '@/features/notifications/NotificationModal'
import { useClearNotification, useMarkAllRead, useMarkRead, useNotifications } from '@/features/notifications/hooks'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import { DEFAULT_PREFERENCES, type AppNotification } from '@/types'

type Tab = 'notifications' | 'stock'

/** One bell for everything that needs attention: inbox notifications and low-stock alerts. */
export function AlertBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const prefs = { ...DEFAULT_PREFERENCES, ...user?.preferences }
  const [unreadOnly, setUnreadOnly] = useState(false)
  const inbox = useNotifications(unreadOnly)
  const stock = useLowStock()
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const clear = useClearNotification()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('notifications')
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null)
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

  const notifications = inbox.data?.items ?? []
  const unread = inbox.data?.unread ?? 0
  const lowItems = prefs.notify_low_stock ? (stock.data ?? []) : []
  const critical = lowItems.filter((i) => i.status === 'critical').length
  const count = unread + lowItems.length

  function toggle() {
    if (!open) setTab(unread === 0 && lowItems.length > 0 ? 'stock' : 'notifications') // open on whatever needs attention
    setOpen((o) => !o)
  }

  function openNotification(n: AppNotification) {
    if (!n.read_at) markRead.mutate(n.id)
    if (n.link) {
      setOpen(false)
      navigate(n.link)
    } else {
      setSelectedNotification(n)
    }
  }

  const tabButton = (id: Tab, label: string, n: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={cn(
        'flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors',
        tab === id ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
      )}
    >
      {label}
      {n > 0 && <span className="num rounded-full bg-accent-soft px-1.5 text-[0.6875rem] text-accent">{n}</span>}
    </button>
  )

  return (
    <>
      <div ref={root} className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={count ? `${count} alerts` : 'No alerts'}
          aria-expanded={open}
          aria-haspopup="true"
          className="relative"
        >
          <Bell className="size-4" />
          {count > 0 && (
            <span
              className={cn(
                'num animate-pop absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[0.625rem] font-semibold leading-none text-white',
                critical > 0 ? 'bg-crit-fg' : lowItems.length > 0 ? 'bg-warn-fg' : 'bg-accent',
              )}
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>

        {open && (
          <div
            role="region"
            aria-label="Alerts"
            className="animate-pop fixed inset-x-3 bottom-20 z-50 origin-bottom-right overflow-hidden rounded-xl border border-border bg-surface shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:bottom-full sm:mb-3 sm:w-96"
          >
            <div className="p-2">
              <div role="tablist" className="flex gap-1 rounded-lg bg-surface-muted p-1">
                {tabButton('notifications', 'Notifications', unread)}
                {tabButton('stock', 'Low stock', lowItems.length)}
              </div>
            </div>

            {tab === 'notifications' ? (
              <>
                <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-fg-muted">
                  <span className="font-medium">Filter</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setUnreadOnly(false)}
                      className={cn(
                        'cursor-pointer rounded px-2 py-0.5 text-xs transition-colors',
                        !unreadOnly ? 'bg-accent-soft font-medium text-accent' : 'hover:text-fg',
                      )}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnreadOnly(true)}
                      className={cn(
                        'cursor-pointer rounded px-2 py-0.5 text-xs transition-colors',
                        unreadOnly ? 'bg-accent-soft font-medium text-accent' : 'hover:text-fg',
                      )}
                    >
                      Unread only {unread > 0 && `(${unread})`}
                    </button>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-fg-muted">
                    {unreadOnly ? 'No unread notifications.' : 'Nothing new. We’ll tell you when something needs you.'}
                  </p>
                ) : (
                  <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                    {notifications.map((n) => (
                      <li key={n.id} className="group relative flex items-center justify-between hover:bg-surface-hover">
                        <button
                          type="button"
                          onClick={() => openNotification(n)}
                          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors"
                        >
                          <span
                            aria-hidden
                            className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-accent')}
                          />
                          <span className="min-w-0 flex-1">
                            <span className={cn('block truncate text-sm', n.read_at ? 'text-fg-muted' : 'font-medium')}>{n.title}</span>
                            {n.body && <span className="mt-0.5 block text-xs text-fg-muted">{n.body}</span>}
                            <span className="mt-1 block text-[0.6875rem] text-fg-subtle">{timeAgo(n.created_at)}</span>
                          </span>
                          {!n.read_at && <span className="sr-only">Unread</span>}
                        </button>
                        <div className="flex shrink-0 items-center gap-1 pr-3">
                          {!n.read_at && (
                            <button
                              type="button"
                              title="Mark as read"
                              aria-label="Mark as read"
                              onClick={(e) => {
                                e.stopPropagation()
                                markRead.mutate(n.id)
                              }}
                              className="cursor-pointer rounded p-1 text-fg-muted transition-colors hover:bg-surface-muted hover:text-accent"
                            >
                              <Check className="size-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="View details"
                            aria-label="View details"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedNotification(n)
                            }}
                            className="cursor-pointer rounded p-1 text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                          >
                            <Info className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Clear notification"
                            aria-label="Clear notification"
                            onClick={(e) => {
                              e.stopPropagation()
                              clear.mutate(n.id)
                            }}
                            className="cursor-pointer rounded p-1 text-fg-muted transition-colors hover:bg-crit-bg hover:text-crit-fg"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => markAll.mutate()}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 border-t border-border px-4 py-3 text-xs font-medium text-accent transition-colors hover:bg-surface-hover"
                  >
                    <CheckCheck className="size-3.5" aria-hidden />
                    Mark all as read
                  </button>
                )}
              </>
            ) : (
              <>
                {lowItems.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-fg-muted">
                    {prefs.notify_low_stock ? 'All products are above their reorder levels.' : 'Low-stock alerts are turned off in Settings.'}
                  </p>
                ) : (
                  <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                    {lowItems.map((i) => (
                      <li key={i.product_id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{i.name}</p>
                          <p className="font-mono text-[0.6875rem] text-fg-subtle">{i.sku}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="num text-xs">
                            <span className="font-semibold">{i.quantity_on_hand}</span>
                            <span className="text-fg-subtle"> / {i.reorder_level}</span>
                          </p>
                          <StockBadge status={i.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  to="/inventory?low=1"
                  onClick={() => setOpen(false)}
                  className="block border-t border-border px-4 py-3 text-center text-xs font-medium text-accent transition-colors hover:bg-surface-hover"
                >
                  View inventory
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </>
  )
}

