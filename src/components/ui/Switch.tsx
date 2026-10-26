import { useId } from 'react'
import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

/** A labelled on/off setting. The whole row is the control, and it's announced as a switch. */
export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'border-accent bg-accent' : 'border-border-strong bg-surface-muted',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'absolute left-0.5 top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
            checked ? 'translate-x-5' : 'translate-x-0',
            !checked && 'bg-fg-subtle',
          )}
        />
      </button>
    </div>
  )
}
