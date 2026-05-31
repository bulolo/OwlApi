// CE 占位：保持 type 导出与 src/ee/sdk-publish/types.ts 一致，
// 让主代码 import 这些类型时不会因 sync 后类型缺失而报错。

export type SdkLanguage =
  | "typescript-fetch"
  | "typescript-axios"
  | "python"
  | "go"
  | "java"

export type VersionStrategy = "manual" | "project_version" | "timestamp"

export interface SdkPublishConfig {
  gitlabBaseUrl: string
  gitlabGroupId: number
  gitlabProjectId?: number
  gitlabProjectUrl?: string
  npmScope: string
  npmPackageName: string
  pyPackageName: string
  versionStrategy: VersionStrategy
  languages: SdkLanguage[]
}

export interface SdkPublishConfigInput extends SdkPublishConfig {
  gitlabToken: string
}

export interface SdkPublishConfigStatus {
  configured: boolean
  config?: SdkPublishConfig
  hasToken: boolean
}

export type SdkRunStatus =
  | "pending"
  | "generating"
  | "pushing"
  | "ci_triggered"
  | "succeeded"
  | "failed"

export interface SdkPublishRun {
  id: number
  env: string
  version: string
  languages: SdkLanguage[]
  status: SdkRunStatus
  errorMessage?: string
  gitTagUrl?: string
  ciPipelineUrl?: string
  createdAt: string
  finishedAt?: string
}

export interface RunPublishInput {
  env: string
  languages: SdkLanguage[]
  version: string
}
