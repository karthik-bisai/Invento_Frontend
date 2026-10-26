import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-4xl leading-tight">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </header>
  )
}
