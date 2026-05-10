import { login as sdkLogin, register as sdkRegister } from '@/lib/sdk'
import { setToken } from './token'
import type { AuthResponse } from './types'

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

export const apiLogin = async (req: { email: string; password: string }): Promise<AuthResponse> => {
  const res = await cast<AuthResponse>(sdkLogin({ body: req, throwOnError: true }))
  if (res.token) setToken(res.token)
  return res
}

export const apiRegister = async (req: { email: string; name: string; password: string; tenant_name?: string; tenant_slug?: string }): Promise<AuthResponse> => {
  const res = await cast<AuthResponse>(sdkRegister({ body: req, throwOnError: true }))
  if (res.token) setToken(res.token)
  return res
}
