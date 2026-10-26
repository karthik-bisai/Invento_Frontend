import { isAxiosError } from 'axios'

/** Turn a FastAPI/gateway error response (string `detail` or a 422 validation array) into a readable message. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!isAxiosError(err)) return fallback
  if (!err.response) return 'Cannot reach the server. Check your connection.'
  const detail = err.response.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) {
    const field = detail[0].loc?.at(-1)
    const msg = String(detail[0].msg).replace(/^Value error, /, '')
    return field ? `${String(field).replace(/_/g, ' ')}: ${msg}` : msg
  }
  if (err.response.status === 429) return 'Too many attempts. Please wait a moment and try again.'
  if (err.response.status === 403) return 'You do not have permission to do that.'
  return fallback
}

/** The gateway's machine-readable reason for a failure (`email_unverified`, `pending_approval`, `otp_cooldown`, ...). */
export function getErrorCode(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const code = err.response?.data?.code
  return typeof code === 'string' ? code : undefined
}

/** Seconds from a Retry-After header, if the server sent one. */
export function getRetryAfter(err: unknown): number | undefined {
  if (!isAxiosError(err)) return undefined
  const n = Number(err.response?.headers?.['retry-after'])
  return Number.isFinite(n) && n > 0 ? n : undefined
}
