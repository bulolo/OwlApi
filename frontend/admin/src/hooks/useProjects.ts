import { useQuery } from "@tanstack/react-query"
import { apiListProjects, apiGetProject, apiCreateProject, apiUpdateProject, apiDeleteProject, type ListQuery, type CreateProjectRequest, type UpdateProjectRequest } from "@/lib/api-client"
import { useApiMutation } from "./useApiMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

export function useProjects(slug: string, q: ListQuery = {}) {
  const result = usePaginatedQuery(["projects", slug, q], () => apiListProjects(slug, q), !!slug)
  return { ...result, projects: result.list }
}

export function useProject(slug: string, projectId: number) {
  return useQuery({ queryKey: ["projects", slug, projectId], queryFn: () => apiGetProject(slug, projectId), enabled: !!slug && !!projectId })
}

export function useCreateProject(slug: string) {
  return useApiMutation((req: CreateProjectRequest) => apiCreateProject(slug, req), { successMessage: "项目创建成功", invalidateKeys: [["projects", slug]] })
}

export function useUpdateProject(slug: string, projectId: number) {
  return useApiMutation((req: UpdateProjectRequest) => apiUpdateProject(slug, projectId, req), { successMessage: "项目已更新", invalidateKeys: [["projects", slug]] })
}

export function useDeleteProject(slug: string) {
  return useApiMutation((id: number) => apiDeleteProject(slug, id), { successMessage: "项目已删除", invalidateKeys: [["projects", slug]] })
}
