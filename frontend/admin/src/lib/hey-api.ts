import type { CreateClientConfig } from './sdk/client.gen'

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: '/',
  responseStyle: 'data',
  auth: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('owlapi_token')
      return token ? `Bearer ${token}` : ''
    }
    return ''
  },
  responseTransformer: async (data) => {
    const obj = data as Record<string, unknown> | undefined
    if (obj && 'code' in obj) {
      if (obj.code !== 0) throw new Error((obj.msg as string) || 'request failed')
      return obj.data
    }
    return data
  },
})
