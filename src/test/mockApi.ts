import { vi } from 'vitest'
import { api, SESSION_KEY } from '@/api/client'
import type { Role, User } from '@/types'

type Config = { params?: Record<string, unknown> } | undefined
type Route = unknown | ((config: Config) => unknown | Promise<unknown>)

/** Stub api.get per URL. A route may be a value or a (possibly throwing) function of the request config. */
export function mockGet(routes: Record<string, Route>) {
  return vi.spyOn(api, 'get').mockImplementation((async (url: string, config?: Config) => {
    if (!(url in routes)) throw new Error(`Unmocked GET ${url}`)
    const route = routes[url]
    const data = typeof route === 'function' ? await (route as (c: Config) => unknown)(config) : route
    return { data }
  }) as never)
}

export function mockPost(data: unknown) {
  return vi.spyOn(api, 'post').mockResolvedValue({ data } as never)
}

/** An error shaped like what axios rejects with, so isAxiosError() and our error helpers recognise it. */
export function httpError(status: number | null, detail?: unknown) {
  return Object.assign(new Error(status ? `Request failed with status code ${status}` : 'Network Error'), {
    isAxiosError: true,
    response: status ? { status, data: detail === undefined ? {} : { detail } } : undefined,
  })
}

export function makeUser(role: Role, email = `${role.toLowerCase()}@acme.com`): User {
  return { id: `user-${role}`, email, role, is_active: true }
}

/** Pretend a session cookie exists, so AuthProvider fetches /auth/me on mount. */
export function signedIn() {
  localStorage.setItem(SESSION_KEY, '1')
}

/** An axios-shaped failure carrying the gateway's `{ detail, code }` body and optional headers (e.g. Retry-After). */
export function apiError(status: number, detail: string, code?: string, headers: Record<string, string> = {}) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { detail, ...(code ? { code } : {}) }, headers },
  })
}

export const makeProfile = (role: Role, over: Partial<User> = {}): User => ({
  ...makeUser(role),
  email_verified: true,
  full_name: null,
  job_title: null,
  phone: null,
  avatar_url: null,
  created_at: '2026-01-15T09:00:00Z',
  preferences: { theme: 'system', compact_tables: false, reduce_motion: false, notify_low_stock: true, notify_email_access_requests: true },
  ...over,
})
