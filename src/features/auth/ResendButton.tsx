import { useEffect, useState } from 'react'

interface ResendButtonProps {
  /** Seconds to wait before the first resend is allowed. */
  initial?: number
  /** Ask for a new code. Resolve with the next cooldown in seconds; handle and show your own errors. */
  onResend: () => Promise<number | undefined>
  label?: string
}

/** "Send a new code" with a visible countdown, so people know when they can ask again. */
export function ResendButton({ initial = 0, onResend, label = 'Send a new code' }: ResendButtonProps) {
  const [left, setLeft] = useState(initial)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [left])

  async function click() {
    setSending(true)
    try {
      const next = await onResend()
      if (next) setLeft(next)
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void click()}
      disabled={left > 0 || sending}
      className="cursor-pointer font-medium text-accent underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-fg-subtle disabled:no-underline"
    >
      {sending ? 'Sending…' : left > 0 ? `${label} in ${left}s` : label}
    </button>
  )
}
