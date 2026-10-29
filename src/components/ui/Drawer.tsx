import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
}

const SIZES = {
  md: 'max-w-md',
  lg: 'max-w-lg sm:max-w-xl',
  xl: 'max-w-md sm:max-w-2xl',
}

/** Right-hand slide-over on the native <dialog> (focus trap, Esc, inert page). Full-width on phones. */
export function Drawer({ open, onClose, title, description, children, footer, size = 'md' }: DrawerProps) {
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
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="drawer-title"
      className={`drawer m-0 ml-auto h-dvh max-h-none w-full ${SIZES[size]} border-l border-border bg-surface p-0 text-fg shadow-pop sm:my-2 sm:mr-2 sm:h-[calc(100dvh-1rem)] sm:rounded-xl sm:border`}
    >
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 id="drawer-title" className="font-display truncate text-2xl leading-tight">
                {title}
              </h2>
              {description && <p className="mt-0.5 truncate text-xs text-fg-muted">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel" className="-mr-2 -mt-1">
              <X className="size-4" />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-5 text-sm">{children}</div>
          {footer && (
            <footer className="flex justify-end gap-2 border-t border-border px-5 py-4 sm:rounded-b-xl">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  )
}
