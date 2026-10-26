import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }

/**
 * Built on the native <dialog> element: focus trap, Esc to close, inert
 * background and focus restoration come from the browser. Becomes a
 * bottom sheet below the sm breakpoint.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // backdrop click
      }}
      aria-labelledby="modal-title"
      className={cn(
        'm-0 mt-auto w-full max-w-none rounded-t-xl border border-border bg-surface p-0 text-fg shadow-pop',
        'sm:m-auto sm:rounded-xl',
        widths[size],
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 px-5 pt-5">
            <div>
              <h2 id="modal-title" className="font-display text-2xl leading-tight">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog" className="-mr-2 -mt-1">
              <X className="size-4" />
            </Button>
          </header>
          <div className="overflow-y-auto px-5 py-4 text-sm">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-2 px-5 pb-5 pt-2">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
