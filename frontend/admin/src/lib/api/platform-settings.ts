import { getToken } from './token'

export interface PlatformSettings {
  allow_self_register: boolean
}

async function apiFetch<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.msg || 'request failed')
  return json.data as T
}

export const apiGetPlatformSettings = () =>
  apiFetch<PlatformSettings>('GET', '/v1/platform/settings')

export const apiUpdatePlatformSettings = (settings: Partial<PlatformSettings>) =>
  apiFetch<PlatformSettings>('PUT', '/v1/platform/settings', settings)
