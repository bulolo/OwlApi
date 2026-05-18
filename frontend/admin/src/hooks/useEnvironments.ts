import { useQuery } from "@tanstack/react-query"
import {
  apiListEnvironments,
  apiCreateEnvironment,
  apiRenameEnvironment,
  apiSetDefaultEnvironment,
  apiDeleteEnvironment,
  apiListProjectBindings,
  apiListEnvBindings,
  apiUpsertBinding,
  apiDeleteBinding,
  apiRenameAlias,
} from "@/lib/api-client"
import type {
  ProjectEnvironment,
  EndpointDatasourceBinding,
  CreateEnvironmentRequest,
  RenameEnvironmentRequest,
  UpsertBindingRequest,
  RenameAliasRequest,
} from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"

const envKey = (slug: string, projectId: number) => ["project-envs", slug, projectId]
const bindingsKey = (slug: string, projectId: number) => ["project-bindings", slug, projectId]
const envBindingsKey = (slug: string, projectId: number, envId: number) => ["env-bindings", slug, projectId, envId]

export function useEnvironments(slug: string, projectId: number) {
  return useQuery<ProjectEnvironment[]>({
    queryKey: envKey(slug, projectId),
    queryFn: () => apiListEnvironments(slug, projectId),
    enabled: !!slug && !!projectId,
  })
}

export function useProjectBindings(slug: string, projectId: number) {
  return useQuery<EndpointDatasourceBinding[]>({
    queryKey: bindingsKey(slug, projectId),
    queryFn: () => apiListProjectBindings(slug, projectId),
    enabled: !!slug && !!projectId,
  })
}

export function useEnvBindings(slug: string, projectId: number, envId: number) {
  return useQuery<EndpointDatasourceBinding[]>({
    queryKey: envBindingsKey(slug, projectId, envId),
    queryFn: () => apiListEnvBindings(slug, projectId, envId),
    enabled: !!slug && !!projectId && !!envId,
  })
}

export function useCreateEnvironment(slug: string, projectId: number) {
  return useAdminMutation({
    mutationFn: (req: CreateEnvironmentRequest) => apiCreateEnvironment(slug, projectId, req),
    successMsg: "环境已创建",
    invalidateKeys: [envKey(slug, projectId), bindingsKey(slug, projectId)],
  })
}

export function useRenameEnvironment(slug: string, projectId: number, envId: number) {
  return useAdminMutation({
    mutationFn: (req: RenameEnvironmentRequest) => apiRenameEnvironment(slug, projectId, envId, req),
    successMsg: "环境已重命名",
    invalidateKeys: [envKey(slug, projectId)],
  })
}

export function useSetDefaultEnvironment(slug: string, projectId: number) {
  return useAdminMutation({
    mutationFn: (envId: number) => apiSetDefaultEnvironment(slug, projectId, envId),
    successMsg: "默认环境已切换",
    invalidateKeys: [envKey(slug, projectId)],
  })
}

export function useDeleteEnvironment(slug: string, projectId: number) {
  return useAdminMutation({
    mutationFn: (envId: number) => apiDeleteEnvironment(slug, projectId, envId),
    successMsg: "环境已删除",
    invalidateKeys: [envKey(slug, projectId), bindingsKey(slug, projectId)],
  })
}

export function useUpsertBinding(slug: string, projectId: number, envId: number) {
  return useAdminMutation({
    mutationFn: (req: UpsertBindingRequest) => apiUpsertBinding(slug, projectId, envId, req),
    successMsg: "绑定已保存",
    invalidateKeys: [bindingsKey(slug, projectId), envBindingsKey(slug, projectId, envId)],
  })
}

export function useDeleteBinding(slug: string, projectId: number, envId: number) {
  return useAdminMutation({
    mutationFn: (handle: string) => apiDeleteBinding(slug, projectId, envId, handle),
    successMsg: "绑定已删除",
    invalidateKeys: [bindingsKey(slug, projectId), envBindingsKey(slug, projectId, envId)],
  })
}

export function useRenameAlias(slug: string, projectId: number) {
  return useAdminMutation({
    mutationFn: (req: RenameAliasRequest) => apiRenameAlias(slug, projectId, req),
    successMsg: "handle 已重命名",
    invalidateKeys: [bindingsKey(slug, projectId)],
  })
}
