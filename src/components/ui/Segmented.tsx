import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Option<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  label: string
}

/** A small set of mutually exclusive choices, shown side by side. */
export function Segmented<T extends string>({ value, onChange, options, label }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1 rounded-lg bg-surface-muted p-1">
      {options.map(({ value: v, label: text, icon: Icon }) => {
        const active = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={cn(
              'flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-[background-color,color,box-shadow] duration-200',
              active ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className="size-3.5" aria-hidden />}
            {text}
          </button>
        )
      })}
    </div>
  )
}
