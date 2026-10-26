import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
  error?: string
  onConfirm: () => void
  onClose: () => void
}

/** Destructive-action confirmation. Keeps the server's refusal (e.g. 409) visible instead of closing. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', loading, error, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-fg-muted">{message}</p>
      {error && (
        <p role="alert" className="mt-3 rounded-md border border-crit-ring bg-crit-bg px-3 py-2 text-xs text-crit-fg">
          {error}
        </p>
      )}
    </Modal>
  )
}
