import {
  useListEndpointVersions, useListEndpointActives, useListEndpointActivationLog,
  getListEndpointVersionsQueryKey, getListEndpointActivesQueryKey,
  getListEndpointActivationLogQueryKey, getListEndpointsQueryKey,
  activateEndpointVersion, createEndpointVersion, unpublishEndpoint,
  deleteEndpointVersion, revertEndpointToActive,
} from "@/lib/sdk"
import type {
  EndpointActiveVersionResp,
  PublishEndpointBody,
  ActivateEndpointVersionParams,
  UnpublishEndpointParams,
  RevertEndpointToActiveParams,
  ListEndpointVersionsParams,
  ListEndpointActivationLogParams,
} from "@/lib/sdk"
import { useAdminMutation } from "./useAdminMutation"

type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }
type EndpointActiveVersion = EndpointActiveVersionResp

export function useEndpointVersions(slug: string, projectId: number, endpointId: number, q: ListQuery = {}) {
  const result = useListEndpointVersions(slug, projectId, endpointId, q as ListEndpointVersionsParams, {
    query: { enabled: !!slug && !!projectId && !!endpointId },
  })
  return { ...result, versions: result.data?.list ?? [], pagination: result.data?.pagination }
}

export function useEndpointActives(slug: string, projectId: number, endpointId: number) {
  return useListEndpointActives(slug, projectId, endpointId, {
    query: {
      enabled: !!slug && !!projectId && !!endpointId,
      // 后端 nil slice 会序列化成 JSON `null`，这里兜底成 []
      select: (data) => (data as EndpointActiveVersion[] | null) ?? [],
    },
  })
}

export function useEndpointActivationLog(slug: string, projectId: number, endpointId: number, q: ListQuery = {}) {
  const result = useListEndpointActivationLog(slug, projectId, endpointId, q as ListEndpointActivationLogParams, {
    query: { enabled: !!slug && !!projectId && !!endpointId },
  })
  return { ...result, logs: result.data?.list ?? [], pagination: result.data?.pagination }
}

export function useCreateEndpointVersion(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (note: string) => createEndpointVersion(slug, projectId, endpointId, { note } as PublishEndpointBody),
    successMsg: "版本已创建",
    invalidateKeys: [getListEndpointVersionsQueryKey(slug, projectId, endpointId)],
  })
}

export function useUnpublishEndpoint(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (envId: number) => unpublishEndpoint(slug, projectId, endpointId, { env_id: envId } as UnpublishEndpointParams),
    successMsg: "接口已在该环境下线",
    invalidateKeys: [
      getListEndpointVersionsQueryKey(slug, projectId, endpointId),
      getListEndpointActivesQueryKey(slug, projectId, endpointId),
      getListEndpointActivationLogQueryKey(slug, projectId, endpointId),
      getListEndpointsQueryKey(slug, projectId),
    ],
  })
}

export function useRevertEndpointToActive(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (envId: number) => revertEndpointToActive(slug, projectId, endpointId, { env_id: envId } as RevertEndpointToActiveParams),
    successMsg: "已还原到线上版本",
    invalidateKeys: [
      getListEndpointVersionsQueryKey(slug, projectId, endpointId),
      getListEndpointActivationLogQueryKey(slug, projectId, endpointId),
      getListEndpointsQueryKey(slug, projectId),
    ],
  })
}

export function useDeleteEndpointVersion(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: (versionId: number) => deleteEndpointVersion(slug, projectId, endpointId, versionId),
    successMsg: "版本已删除",
    invalidateKeys: [
      getListEndpointVersionsQueryKey(slug, projectId, endpointId),
      getListEndpointActivationLogQueryKey(slug, projectId, endpointId),
      getListEndpointsQueryKey(slug, projectId),
    ],
  })
}

export function useActivateEndpointVersion(slug: string, projectId: number, endpointId: number) {
  return useAdminMutation({
    mutationFn: ({ versionId, envId }: { versionId: number; envId: number }) =>
      activateEndpointVersion(slug, projectId, endpointId, versionId, { env_id: envId } as ActivateEndpointVersionParams),
    successMsg: "已切换到此版本",
    invalidateKeys: [
      getListEndpointVersionsQueryKey(slug, projectId, endpointId),
      getListEndpointActivesQueryKey(slug, projectId, endpointId),
      getListEndpointActivationLogQueryKey(slug, projectId, endpointId),
      getListEndpointsQueryKey(slug, projectId),
    ],
  })
}
