import { login as sdkLogin, register as sdkRegister, changePassword as sdkChangePassword } from '@/lib/sdk'
import { wrapResponse, setToken } from './token'
import type { AuthResponse } from './types'

export const apiLogin = async (req: { email: string; password: string }): Promise<AuthResponse> => {
  const res = await wrapResponse<AuthResponse>(sdkLogin({ body: req, throwOnError: true }))
  if (res.token) setToken(res.token)
  return res
}

export const apiRegister = async (req: { email: string; name: string; password: string; tenant_name?: string; tenant_slug?: string }): Promise<AuthResponse> => {
  const res = await wrapResponse<AuthResponse>(sdkRegister({ body: req, throwOnError: true }))
  if (res.token) setToken(res.token)
  return res
}

export const apiChangePassword = (req: { old_password: string; new_password: string }): Promise<void> =>
  wrapResponse<void>(sdkChangePassword({ body: req }))
