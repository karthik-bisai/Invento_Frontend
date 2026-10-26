import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, className, id, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-fg-muted">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle [&>svg]:size-3.5">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-9 w-full rounded-md border bg-surface px-3 text-sm text-fg transition-[border-color,box-shadow]',
            'placeholder:text-fg-subtle',
            'focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15',
            'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60',
            error ? 'border-crit-fg' : 'border-border-strong',
            leftIcon && 'pl-9',
            className,
          )}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-crit-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
