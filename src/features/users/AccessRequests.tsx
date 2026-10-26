import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Avatar } from '@/components/layout/Avatar'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { timeAgo } from '@/lib/format'
import { displayName, ROLE_LABELS, type AccessRequest, type RequestStatus, type Role } from '@/types'
import { type RequestFilter, useAccessRequests, useApproveRequest, useRejectRequest } from './requests'

const PAGE_SIZE = 10
const ROLES = Object.keys(ROLE_LABELS) as Role[]

const FILTERS: { value: RequestFilter; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Declined' },
  { value: 'ALL', label: 'All' },
]

const STATUS: Record<RequestStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Declined', variant: 'danger' },
}

function Decision({ request, onDecline }: { request: AccessRequest; onDecline: () => void }) {
  const approve = useApproveRequest()
  const [role, setRole] = useState<Role>('WAREHOUSE_STAFF')
  const [error, setError] = useState<string>()

  async function go() {
    setError(undefined)
    try {
      await approve.mutateAsync({ id: request.id, role })
    } catch (err) {
      setError(getErrorMessage(err, 'We couldn’t approve this request.'))
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="w-40">
        <Select aria-label={`Role for ${displayName(request.user)}`} value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-8 text-xs">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>
      <Button size="sm" variant="primary" onClick={() => void go()} loading={approve.isPending}>
        <Check className="size-3.5" aria-hidden />
        Approve
      </Button>
      <Button size="sm" onClick={onDecline} disabled={approve.isPending}>
        <X className="size-3.5" aria-hidden />
        Decline
      </Button>
      {error && (
        <p role="alert" className="basis-full text-right text-xs text-crit-fg">
          {error}
        </p>
      )}
    </div>
  )
}

export function AccessRequests() {
  const [filter, setFilter] = useState<RequestFilter>('PENDING')
  const [page, setPage] = useState(1)
  const [declining, setDeclining] = useState<AccessRequest | null>(null)
  const [reason, setReason] = useState('')
  const [declineError, setDeclineError] = useState<string>()
  const requests = useAccessRequests({ status: filter, page, size: PAGE_SIZE })
  const reject = useRejectRequest()

  const columns: Column<AccessRequest>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar email={r.user.email} name={r.user.full_name} src={r.user.avatar_url} />
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName(r.user)}</p>
            {r.user.full_name && <p className="truncate text-xs text-fg-subtle">{r.user.email}</p>}
          </div>
        </div>
      ),
    },
    { key: 'requested', header: 'Requested', hideOnMobile: true, render: (r) => <span title={new Date(r.created_at).toLocaleString()}>{timeAgo(r.created_at)}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={STATUS[r.status].variant}>{STATUS[r.status].label}</Badge> },
    {
      key: 'actions',
      header: 'Decision',
      align: 'right',
      render: (r) =>
        r.status === 'PENDING' ? (
          <Decision request={r} onDecline={() => setDeclining(r)} />
        ) : (
          <span className="text-xs text-fg-subtle">
            {r.decided_at ? timeAgo(r.decided_at) : ''}
            {r.note ? ` · “${r.note}”` : ''}
          </span>
        ),
    },
  ]

  function closeDecline() {
    setDeclining(null)
    setReason('')
    setDeclineError(undefined)
  }

  async function confirmDecline() {
    if (!declining) return
    setDeclineError(undefined)
    try {
      await reject.mutateAsync({ id: declining.id, note: reason })
      closeDecline()
    } catch (err) {
      setDeclineError(getErrorMessage(err, 'We couldn’t decline this request.'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Show requests" className="inline-flex w-fit gap-1 rounded-lg bg-surface-muted p-1">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filter === value}
            onClick={() => {
              setFilter(value)
              setPage(1)
            }}
            className={`h-8 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors ${filter === value ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {requests.isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
          <span>{getErrorMessage(requests.error, 'Couldn’t load access requests.')}</span>
          <Button size="sm" onClick={() => requests.refetch()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable
        caption="Access requests"
        columns={columns}
        data={requests.data?.items ?? []}
        rowKey={(r) => r.id}
        loading={requests.isLoading}
        empty={filter === 'PENDING' ? 'No one is waiting for access. New sign-ups appear here once they confirm their email.' : 'No requests to show.'}
      />
      {requests.data && <Pagination page={page} size={PAGE_SIZE} total={requests.data.total} onPageChange={setPage} />}

      <Modal
        open={!!declining}
        onClose={closeDecline}
        title="Decline this request?"
        description={declining ? `${displayName(declining.user)} will get an email saying their request was declined.` : undefined}
        size="sm"
        footer={
          <>
            <Button onClick={closeDecline}>Cancel</Button>
            <Button variant="danger" loading={reject.isPending} onClick={() => void confirmDecline()}>
              Decline request
            </Button>
          </>
        }
      >
        <label htmlFor="decline-reason" className="text-xs font-medium text-fg-muted">
          Reason (optional, included in the email)
        </label>
        <textarea
          id="decline-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full resize-none rounded-md border border-border-strong bg-surface p-3 text-sm focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
        />
        {declineError && (
          <p role="alert" className="mt-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
            {declineError}
          </p>
        )}
      </Modal>
    </div>
  )
}
