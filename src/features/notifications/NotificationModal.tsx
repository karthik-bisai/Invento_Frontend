import { ArrowRight, Check, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { shortDate, timeAgo } from '@/lib/format'
import type { AppNotification } from '@/types'
import { useClearNotification, useMarkRead } from './hooks'

interface Props {
  notification: AppNotification | null
  onClose: () => void
}

function getKindMeta(kind: string): { label: string; explanation: string; variant: 'info' | 'warning' | 'success' | 'neutral' } {
  switch (kind) {
    case 'access_requested':
      return {
        label: 'Access Request',
        explanation: 'An employee registered and is awaiting administrator access approval.',
        variant: 'info',
      }
    case 'access_decided':
      return {
        label: 'Account Status',
        explanation: 'An update on your organization access request.',
        variant: 'success',
      }
    case 'low_stock':
      return {
        label: 'Low Stock Alert',
        explanation: 'A product has reached or fallen below its configured reorder threshold.',
        variant: 'warning',
      }
    default:
      return {
        label: 'System Notification',
        explanation: 'Operational notification generated for your account.',
        variant: 'neutral',
      }
  }
}

export function NotificationModal({ notification, onClose }: Props) {
  const navigate = useNavigate()
  const markRead = useMarkRead()
  const clear = useClearNotification()

  if (!notification) return null

  const meta = getKindMeta(notification.kind)

  function onAction() {
    if (!notification?.read_at) {
      markRead.mutate(notification!.id)
    }
    onClose()
    if (notification?.link) {
      navigate(notification.link)
    }
  }

  function onDismiss() {
    clear.mutate(notification!.id)
    onClose()
  }

  function onToggleRead() {
    if (!notification?.read_at) {
      markRead.mutate(notification!.id)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-pop">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <Badge variant={notification.read_at ? 'neutral' : 'info'}>
                {notification.read_at ? 'Read' : 'Unread'}
              </Badge>
            </div>
            <h2 id="notification-modal-title" className="font-display text-xl font-semibold text-fg">
              {notification.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4 text-sm">
          <div>
            <span className="text-xs font-medium text-fg-muted">Message</span>
            <p className="mt-1 leading-relaxed text-fg">{notification.body || 'No additional message details.'}</p>
          </div>

          <div className="rounded-lg bg-surface-muted/60 p-3 text-xs">
            <span className="font-medium text-fg-muted">Why was this generated?</span>
            <p className="mt-0.5 text-fg-subtle">{meta.explanation}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-3 text-xs">
            <div>
              <span className="text-fg-muted">Created</span>
              <p className="mt-0.5 font-medium text-fg">
                {shortDate(notification.created_at)} ({timeAgo(notification.created_at)})
              </p>
            </div>
            {notification.read_at && (
              <div>
                <span className="text-fg-muted">Read at</span>
                <p className="mt-0.5 font-medium text-fg">{shortDate(notification.read_at)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            {!notification.read_at && (
              <Button variant="ghost" size="sm" onClick={onToggleRead} loading={markRead.isPending}>
                <Check className="size-3.5 mr-1" />
                Mark as read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onDismiss} loading={clear.isPending} className="text-crit-fg hover:bg-crit-bg">
              <Trash2 className="size-3.5 mr-1" />
              Clear
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={onClose}>Close</Button>
            {notification.link && (
              <Button variant="primary" onClick={onAction}>
                Open destination
                <ArrowRight className="size-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
