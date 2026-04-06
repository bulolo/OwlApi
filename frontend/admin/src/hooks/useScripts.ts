import { useQuery } from "@tanstack/react-query"
import { apiListScripts, apiCreateScript, apiUpdateScript, apiDeleteScript, type ListQuery, type CreateScriptRequest, type UpdateScriptRequest } from "@/lib/api-client"
import { useApiMutation } from "./useApiMutation"

export function useScripts(slug: string, q: ListQuery = {}) {
  const query = useQuery({ queryKey: ["scripts", slug, q], queryFn: () => apiListScripts(slug, q), enabled: !!slug })
  return { ...query, scripts: query.data?.list ?? [], pagination: query.data?.pagination }
}

export function useCreateScript(slug: string) {
  return useApiMutation((req: CreateScriptRequest) => apiCreateScript(slug, req), { successMessage: "脚本创建成功", invalidateKeys: [["scripts", slug]] })
}

export function useUpdateScript(slug: string) {
  return useApiMutation(({ id, req }: { id: number; req: UpdateScriptRequest }) => apiUpdateScript(slug, id, req), { successMessage: "脚本已更新", invalidateKeys: [["scripts", slug]] })
}

export function useDeleteScript(slug: string) {
  return useApiMutation((id: number) => apiDeleteScript(slug, id), { successMessage: "脚本已删除", invalidateKeys: [["scripts", slug]] })
}
