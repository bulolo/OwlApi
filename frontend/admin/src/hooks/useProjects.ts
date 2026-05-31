import {
  useListProjects, useGetProject,
  getListProjectsQueryKey,
  createProject, updateProject, deleteProject,
} from "@/lib/sdk"
import type { CreateProjectBody, UpdateProjectBody, ListProjectsParams } from "@/lib/sdk"
import { useAdminMutation } from "./useAdminMutation"

type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }

export function useProjects(slug: string, q: ListQuery = {}) {
  const result = useListProjects(slug, q as ListProjectsParams, {
    query: { enabled: !!slug },
  })
  return { ...result, projects: result.data?.list ?? [], pagination: result.data?.pagination }
}

export function useProject(slug: string, projectId: number) {
  return useGetProject(slug, projectId, {
    query: { enabled: !!slug && !!projectId },
  })
}

export function useCreateProject(slug: string) {
  return useAdminMutation({
    mutationFn: (req: CreateProjectBody) => createProject(slug, req),
    successMsg: "项目创建成功",
    invalidateKeys: [getListProjectsQueryKey(slug)],
  })
}

export function useUpdateProject(slug: string, projectId: number) {
  return useAdminMutation({
    mutationFn: (req: UpdateProjectBody) => updateProject(slug, projectId, req),
    successMsg: "项目已更新",
    invalidateKeys: [getListProjectsQueryKey(slug)],
  })
}

export function useDeleteProject(slug: string) {
  return useAdminMutation({
    mutationFn: (id: number) => deleteProject(slug, id),
    successMsg: "项目已删除",
    invalidateKeys: [getListProjectsQueryKey(slug)],
  })
}
