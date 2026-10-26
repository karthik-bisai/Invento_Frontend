import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface Column<T> {
  key: string
  header: string
  /** Cell renderer. Defaults to row[key]. */
  render?: (row: T) => ReactNode
  /** Value used for client-side sorting; presence makes the column sortable. */
  sortValue?: (row: T) => string | number | null | undefined
  /** Mark sortable without a sortValue (server-side sorting). */
  sortable?: boolean
  align?: 'left' | 'right'
  /** Numeric columns use tabular figures. */
  numeric?: boolean
  className?: string
  /** Hide below the md breakpoint to keep dense tables readable on phones. */
  hideOnMobile?: boolean
}

export type SortDir = 'asc' | 'desc'
export interface SortState {
  key: string
  dir: SortDir
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  loading?: boolean
  empty?: ReactNode
  onRowClick?: (row: T) => void
  /** Controlled sort (e.g. server-side). Omit for client-side sorting. */
  sort?: SortState | null
  onSortChange?: (sort: SortState | null) => void
  caption?: string
  className?: string
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1 // nulls last
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  empty,
  onRowClick,
  sort: controlledSort,
  onSortChange,
  caption,
  className,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = useState<SortState | null>(null)
  const controlled = controlledSort !== undefined
  const sort = controlled ? controlledSort : internalSort

  const rows = useMemo(() => {
    if (controlled || !sort) return data
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return data
    const sign = sort.dir === 'asc' ? 1 : -1
    return [...data].sort((a, b) => sign * compare(col.sortValue!(a), col.sortValue!(b)))
  }, [data, columns, sort, controlled])

  // asc -> desc -> unsorted
  function toggleSort(key: string) {
    const next: SortState | null =
      sort?.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null
    if (controlled) onSortChange?.(next)
    else setInternalSort(next)
  }

  return (
    <div className={cn('overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-surface', className)}>
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-surface">
          <tr className="border-b border-border">
            {columns.map((col) => {
              const sortable = col.sortable ?? !!col.sortValue
              const active = sort?.key === col.key
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : sortable ? 'none' : undefined}
                  className={cn(
                    'h-11 whitespace-nowrap px-4 text-xs font-medium text-fg-subtle',
                    col.align === 'right' && 'text-right',
                    col.hideOnMobile && 'hidden md:table-cell',
                  )}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        '-mx-1.5 inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:text-fg',
                        col.align === 'right' && 'flex-row-reverse',
                        active && 'text-fg',
                      )}
                    >
                      {col.header}
                      {active ? (
                        sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 5 }, (_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className={cn('h-(--row-h) px-4', col.hideOnMobile && 'hidden md:table-cell')}>
                    <div className="skeleton h-3 w-3/4 rounded" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading &&
            rows.map((row, i) => (
              <tr
                key={rowKey(row)}
                style={{ '--d': Math.min(i, 12) * 28 } as CSSProperties}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'animate-rise border-b border-border last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-surface-hover focus-visible:bg-surface-hover',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'h-(--row-h) px-4 py-1',
                      col.align === 'right' && 'text-right',
                      col.numeric && 'num',
                      col.hideOnMobile && 'hidden md:table-cell',
                      col.className,
                    )}
                  >
                    {col.render ? col.render(row) : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
      {!loading && rows.length === 0 && (
        <div className="px-4 py-10 text-center text-sm text-fg-muted">{empty ?? 'No records found.'}</div>
      )}
    </div>
  )
}
