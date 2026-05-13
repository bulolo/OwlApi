import { useQuery } from "@tanstack/react-query"
import { apiListProjects, apiGetProject, apiCreateProject, apiUpdateProject, apiDeleteProject, type ListQuery, type CreateProjectRequest, type UpdateProjectRequest } from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

export function useProjects(slug: string, q: ListQuery = {}) {
  const result = usePaginatedQuery(["projects", slug, q], () => apiListProjects(slug, q), !!slug)
  return { ...result, projects: result.list }
}

export function useProject(slug: string, projectId: number) {
  return useQuery({ queryKey: ["projects", slug, projectId], queryFn: () => apiGetProject(slug, projectId), enabled: !!slug && !!projectId })
}

export function useCreateProject(slug: string) {
  return useAdminMutation({ mutationFn: (req: CreateProjectRequest) => apiCreateProject(slug, req), successMsg: "项目创建成功", invalidateKeys: [["projects", slug]] })
}

export function useUpdateProject(slug: string, projectId: number) {
  return useAdminMutation({ mutationFn: (req: UpdateProjectRequest) => apiUpdateProject(slug, projectId, req), successMsg: "项目已更新", invalidateKeys: [["projects", slug]] })
}

export function useDeleteProject(slug: string) {
  return useAdminMutation({ mutationFn: (id: number) => apiDeleteProject(slug, id), successMsg: "项目已删除", invalidateKeys: [["projects", slug]] })
}
