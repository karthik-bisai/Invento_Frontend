import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  invalid?: boolean
  autoFocus?: boolean
}

/** Six single-digit boxes that behave like one field: typing advances, backspace retreats, paste and autofill spread across. */
export function OtpInput({ value, onChange, length = 6, disabled, invalid, autoFocus }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const focus = (i: number) => refs.current[Math.max(0, Math.min(i, length - 1))]?.focus()

  const write = (at: number, incoming: string) => {
    const clean = incoming.replace(/\D/g, '')
    if (!clean) return
    const next = value.padEnd(at, ' ').slice(0, at) + clean + value.slice(at + clean.length)
    onChange(next.replace(/\s/g, '').slice(0, length))
    focus(at + clean.length)
  }

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[i]) onChange(value.slice(0, i) + value.slice(i + 1))
      else if (i > 0) {
        onChange(value.slice(0, i - 1) + value.slice(i))
        focus(i - 1)
      }
    } else if (e.key === 'ArrowLeft') focus(i - 1)
    else if (e.key === 'ArrowRight') focus(i + 1)
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      onChange(pasted)
      focus(pasted.length)
    }
  }

  return (
    <div role="group" aria-label="Verification code" className="flex gap-2 sm:gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && i === 0}
          maxLength={length} // lets a browser autofill drop the whole code into one box; write() spreads it out
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => write(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'num h-14 w-full min-w-0 rounded-md border bg-surface text-center text-2xl font-semibold transition-[border-color,box-shadow,transform]',
            'focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60',
            d && 'border-fg-subtle',
            invalid ? 'border-crit-fg' : 'border-border-strong',
          )}
        />
      ))}
    </div>
  )
}
