import axios from 'axios'

/**
 * The browser never holds a token. Signing in makes the gateway set an HTTP-only session cookie that scripts
 * can't read. All we keep locally is a hint that a session probably exists (so signed-out visitors don't
 * trigger a pointless /auth/me), plus the CSRF token the gateway hands back, in memory only.
 */
export const SESSION_KEY = 'inventory.session'
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

export function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function setSessionHint(active: boolean) {
  try {
    if (active) localStorage.setItem(SESSION_KEY, '1')
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable */
  }
}

let csrfToken: string | null = null
export const setCsrfToken = (token: string | null) => {
  csrfToken = token
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1',
  withCredentials: true,
})

const UNSAFE = new Set(['post', 'put', 'patch', 'delete'])
// Endpoints where a 401 means "wrong details", not "your session ended".
const PUBLIC = /\/auth\/(login|login-code\/(request|verify)|signup|verify-otp|resend-otp|forgot-password|reset-password)$/

api.interceptors.request.use((config) => {
  if (csrfToken && UNSAFE.has((config.method ?? 'get').toLowerCase())) config.headers['X-CSRF-Token'] = csrfToken
  return config
})

api.interceptors.response.use(
  (res) => {
    const token = res.headers?.['x-csrf-token']
    if (typeof token === 'string' && token) csrfToken = token
    return res
  },
  (error) => {
    if (error.response?.status === 401 && !PUBLIC.test(error.config?.url ?? '')) {
      setSessionHint(false)
      csrfToken = null
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)
