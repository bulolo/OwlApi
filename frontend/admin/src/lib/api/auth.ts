import { login as sdkLogin, register as sdkRegister } from '@/lib/sdk'
import { setToken } from './token'
import type { AuthResponse } from './types'

// ── SDK wrappers ─────────────────────────────────────────────────────────────
// The generated SDK functions return typed data inside an opaque response
// object. We unwrap with `as` only at this boundary so the rest of the app
// stays type-safe.

export const apiLogin = async (req: { email: string; password: string }): Promise<AuthResponse> => {
  const res = await (sdkLogin({ body: req, throwOnError: true }) as unknown as Promise<AuthResponse>)
  if (res.token) setToken(res.token)
  return res
}

export const apiRegister = async (req: { email: string; name: string; password: string; tenant_name?: string; tenant_slug?: string }): Promise<AuthResponse> => {
  const res = await (sdkRegister({ body: req, throwOnError: true }) as unknown as Promise<AuthResponse>)
  if (res.token) setToken(res.token)
  return res
}
