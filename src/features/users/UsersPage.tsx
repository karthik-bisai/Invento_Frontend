import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { getErrorMessage } from '@/api/errors'
import { Avatar } from '@/components/layout/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { useAuth } from '@/features/auth/AuthContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/cn'
import { displayName, ROLE_LABELS, type User } from '@/types'
import { AccessRequests } from './AccessRequests'
import { useAccessRequests } from './requests'
import { useUsers } from './hooks'
import { UserDrawer, type UserTarget } from './UserDrawer'

const PAGE_SIZE = 15

type Tab = 'people' | 'requests'

export function UsersPage() {
  const { user: me } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'requests' ? 'requests' : 'people'
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<UserTarget>(null)

  const q = useDebouncedValue(search.trim(), 300)
  const users = useUsers({ page, size: PAGE_SIZE, q })
  const waiting = useAccessRequests({ status: 'PENDING', page: 1, size: 1 }).data?.total ?? 0

  const columns: Column<User>[] = [
    {
      key: 'email',
      header: 'Person',
      sortValue: (u) => displayName(u),
      render: (u) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar email={u.email} name={u.full_name} src={u.avatar_url} />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {displayName(u)}
              {u.id === me?.id && <span className="ml-2 text-xs font-normal text-fg-subtle">(you)</span>}
            </p>
            {u.full_name && <p className="truncate text-xs text-fg-subtle">{u.email}</p>}
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', hideOnMobile: true, sortValue: (u) => ROLE_LABELS[u.role], render: (u) => <Badge variant={u.role === 'ADMIN' ? 'info' : 'neutral'}>{ROLE_LABELS[u.role]}</Badge> },
    { key: 'status', header: 'Status', sortValue: (u) => Number(u.is_active), render: (u) => <Badge variant={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Active' : 'Inactive'}</Badge> },
  ]

  const tabButton = (id: Tab, label: string, badge?: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setParams(id === 'people' ? {} : { tab: id }, { replace: true })}
      className={cn(
        'flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
        tab === id ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
      )}
    >
      {label}
      {!!badge && <span className="num animate-pop rounded-full bg-warn-bg px-1.5 text-[0.6875rem] font-semibold text-warn-fg">{badge}</span>}
    </button>
  )

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <PageHeader
        title="Users"
        description="Who can sign in, and what they can do. New sign-ups wait under Requests for your approval."
        action={
          tab === 'people' && (
            <Button variant="primary" onClick={() => setTarget('new')}>
              <Plus className="size-3.5" aria-hidden />
              New user
            </Button>
          )
        }
      />

      <div role="tablist" aria-label="Users" className="inline-flex w-fit gap-1 rounded-lg bg-surface-muted p-1">
        {tabButton('people', 'People')}
        {tabButton('requests', 'Requests', waiting)}
      </div>

      {tab === 'requests' ? (
        <AccessRequests />
      ) : (
        <>
          <div className="w-full sm:max-w-xs">
            <Input
              aria-label="Search users"
              placeholder="Search name or email…"
              leftIcon={<Search />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {users.isError && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
              <span>{getErrorMessage(users.error, 'Couldn’t load users.')}</span>
              <Button size="sm" onClick={() => users.refetch()}>
                Retry
              </Button>
            </div>
          )}

          <DataTable
            caption="Users"
            columns={columns}
            data={users.data?.items ?? []}
            rowKey={(u) => u.id}
            loading={users.isLoading}
            onRowClick={setTarget}
            empty={q ? 'No users match your search.' : 'No users yet.'}
          />
          {users.data && <Pagination page={page} size={PAGE_SIZE} total={users.data.total} onPageChange={setPage} />}

          <UserDrawer key={target === 'new' ? 'new' : (target?.id ?? 'closed')} target={target} onClose={() => setTarget(null)} />
        </>
      )}
    </div>
  )
}
