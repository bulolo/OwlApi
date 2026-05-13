import { getPlatformSettings, updatePlatformSettings } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { PlatformSettingsResp } from '@/lib/sdk'

export type PlatformSettings = PlatformSettingsResp

export const apiGetPlatformSettings = () =>
  wrapResponse<PlatformSettings>(getPlatformSettings())

export const apiUpdatePlatformSettings = (settings: Partial<PlatformSettings>) =>
  wrapResponse<PlatformSettings>(updatePlatformSettings({ body: settings }))
