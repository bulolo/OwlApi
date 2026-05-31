import {
  useListProjectEnvironments, useListProjectBindings, useListEnvBindings,
  getListProjectEnvironmentsQueryKey, getListProjectBindingsQueryKey, getListEnvBindingsQueryKey,
  createProjectEnvironment, renameProjectEnvironment, setDefaultProjectEnvironment, deleteProjectEnvironment,
  upsertEnvBinding, deleteEnvBinding, renameProjectAlias,
} from "@/lib/sdk"
import type {
  EnvironmentResp as ProjectEnvironment,
  BindingResp as EndpointDatasourceBinding,
  CreateEnvReq as CreateEnvironmentRequest,
  RenameEnvReq as RenameEnvironmentRequest,
  UpsertBindingReq as UpsertBindingRequest,
  RenameAliasReq as RenameAliasRequest,
} from "@/lib/sdk"
import { useAdminMutation } from "./useAdminMutation"

// 后端列表接口返回原始数组，空列表是 Go nil slice → JSON null；这里统一兜底为 []，
// 避免消费端解构默认值（只兜 undefined、不兜 null）漏判导致 `null.map` 崩溃。
export function useEnvironments(slug: string, projectId: number) {
  const result = useListProjectEnvironments(slug, projectId, {
    query: { enabled: !!slug && !!projectId },
  })
  return { ...result, data: (result.data ?? []) as ProjectEnvironment[] }
}

export function useProjectBindings(slug: string, projectId: number) {
  const result = useListProjectBindings(slug, projectId, {
    query: { enabled: !!slug && !!projectId },
  })
  return { ...result, data: (result.data ?? []) as EndpointDatasourceBinding[] }
}

export function useEnvBindings(slug: string, projectId: number, envId: number) {
  const result = useListEnvBindings(slug, projectId, envId, {
    query: { enabled: !!slug && !!projectId && !!envId },
  })
  return { ...result, data: (result.data ?? []) as EndpointDatasourceBinding[] }
}

export function useCreateEnvironment(slug: string, projectId: number) {
  return useAdminMutation({
    mutationFn: (req: CreateEnvironmentRequest) => createProjectEnvironment(slug, projectId, req),
    successMsg: "环境已创建",
    invalidateKeys: [
      getListProjectEnvironmentsQueryKey(slug, projectId),
      getListProjectBindingsQueryKey(slug, projectId),
    ],
  })
}

export function useRenameEnvironment(slug: string, projectId: number, envId: number) {
  return useAdminMutation({
    mutationFn: (req: RenameEnvironmentRequest) => renameProjectEnvironment(slug, projectId, envId, req),
    successMsg: "环境已重命名",
    invalidateKeys: [getListProjectEnvironmentsQueryKey(slug, projectId)],
  })
}

export function useSetDefaultEnvironment(slug: string, projectId: number) {
  return useAdminMutation({
    mutationFn: (envId: number) => setDefaultProjectEnvironment(slug, projectId, envId),
    successMsg: "默认环境已切换",
    invalidateKeys: [getListProjectEnvironmentsQueryKey(slug, projectId)],
  })
}

export function useDeleteEnvironment(slug: string, projectId: number) {
  return useAdminMutation({
    mutationFn: (envId: number) => deleteProjectEnvironment(slug, projectId, envId),
    successMsg: "环境已删除",
    invalidateKeys: [
      getListProjectEnvironmentsQueryKey(slug, projectId),
      getListProjectBindingsQueryKey(slug, projectId),
    ],
  })
}

export function useUpsertBinding(slug: string, projectId: number, envId: number) {
  return useAdminMutation({
    mutationFn: (req: UpsertBindingRequest) => upsertEnvBinding(slug, projectId, envId, req),
    successMsg: "绑定已保存",
    invalidateKeys: [
      getListProjectBindingsQueryKey(slug, projectId),
      getListEnvBindingsQueryKey(slug, projectId, envId),
    ],
  })
}

export function useDeleteBinding(slug: string, projectId: number, envId: number) {
  return useAdminMutation({
    mutationFn: (handle: string) => deleteEnvBinding(slug, projectId, envId, handle),
    successMsg: "绑定已删除",
    invalidateKeys: [
      getListProjectBindingsQueryKey(slug, projectId),
      getListEnvBindingsQueryKey(slug, projectId, envId),
    ],
  })
}

export function useRenameAlias(slug: string, projectId: number) {
  return useAdminMutation({
    mutationFn: (req: RenameAliasRequest) => renameProjectAlias(slug, projectId, req),
    successMsg: "handle 已重命名",
    invalidateKeys: [getListProjectBindingsQueryKey(slug, projectId)],
  })
}
