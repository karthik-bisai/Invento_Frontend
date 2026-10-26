import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './Button'

interface PaginationProps {
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, size, total, onPageChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / size))
  const from = total === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, total)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-xs text-fg-muted">
      <p className="num">
        {from}–{to} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="num hidden sm:inline">
          Page {page} of {pages}
        </span>
        <Button size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </Button>
        <Button size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </nav>
  )
}
