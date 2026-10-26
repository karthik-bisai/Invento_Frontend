import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-9 w-full cursor-pointer appearance-none rounded-md border border-border-strong bg-surface pl-3 pr-8 text-sm text-fg transition-[border-color,box-shadow]',
          'focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </div>
  )
})
