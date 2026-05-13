import { apiListScripts, apiCreateScript, apiUpdateScript, apiDeleteScript, type ListQuery, type CreateScriptRequest, type UpdateScriptRequest } from "@/lib/api-client"
import { useAdminMutation } from "./useAdminMutation"
import { usePaginatedQuery } from "./usePaginatedQuery"

export function useScripts(slug: string, q: ListQuery = {}) {
  const result = usePaginatedQuery(["scripts", slug, q], () => apiListScripts(slug, q), !!slug)
  return { ...result, scripts: result.list }
}

export function useCreateScript(slug: string) {
  return useAdminMutation({ mutationFn: (req: CreateScriptRequest) => apiCreateScript(slug, req), successMsg: "脚本创建成功", invalidateKeys: [["scripts", slug]] })
}

export function useUpdateScript(slug: string) {
  return useAdminMutation({ mutationFn: ({ id, req }: { id: number; req: UpdateScriptRequest }) => apiUpdateScript(slug, id, req), successMsg: "脚本已更新", invalidateKeys: [["scripts", slug]] })
}

export function useDeleteScript(slug: string) {
  return useAdminMutation({ mutationFn: (id: number) => apiDeleteScript(slug, id), successMsg: "脚本已删除", invalidateKeys: [["scripts", slug]] })
}
