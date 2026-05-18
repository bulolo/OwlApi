import { health } from '@/lib/sdk'
import { wrapResponse } from './token'
import type { HealthResp } from '@/lib/sdk'

export type HealthInfo = HealthResp

export const apiHealth = () => wrapResponse<HealthInfo>(health())
