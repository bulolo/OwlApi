// CE 占位：返回 canPublish:false，让主代码 UI 自动降级隐藏发布入口。
// 签名必须跟 src/ee/sdk-publish/hooks/useSdkPublish.ts 对齐（仅 canPublish 不同）。

import type {
  RunPublishInput,
  SdkPublishConfigInput,
  SdkPublishConfigStatus,
  SdkPublishRun,
} from "../types"

interface UseSdkPublishResult {
  canPublish: false
  status: SdkPublishConfigStatus
  runs: SdkPublishRun[]
  loading: boolean
  saveConfig: (_: SdkPublishConfigInput) => Promise<void>
  runPublish: (_: RunPublishInput) => Promise<void>
}

export function useSdkPublish(_projectId: number): UseSdkPublishResult {
  return {
    canPublish: false,
    status: { configured: false, hasToken: false },
    runs: [],
    loading: false,
    saveConfig: async () => undefined,
    runPublish: async () => undefined,
  }
}
