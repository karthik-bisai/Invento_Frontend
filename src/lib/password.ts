const MIN = 8
const MAX_BYTES = 72 // bcrypt only uses the first 72 bytes; the API rejects anything longer

/** Same rule as the API, so the form never submits a password the server will refuse. */
export function validatePassword(password: string): string | undefined {
  if (password.length < MIN) return `Use at least ${MIN} characters.`
  if (new TextEncoder().encode(password).length > MAX_BYTES) {
    return 'That’s too long. Keep it under 72 bytes (accented letters and emoji count extra).'
  }
  return undefined
}
