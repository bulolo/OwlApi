import {
  useListScripts, useListScriptBuiltins,
  getListScriptsQueryKey,
  createScript, updateScript, deleteScript, copyScriptFromBuiltin,
} from "@/lib/sdk"
import type { CreateScriptBody, UpdateScriptBody, ListScriptsParams, ListScriptBuiltinsParams } from "@/lib/sdk"
import { useAdminMutation } from "./useAdminMutation"

type ListQuery = { page?: number; size?: number; is_pager?: number; keyword?: string }

export function useScripts(slug: string, q: ListQuery = {}) {
  const result = useListScripts(slug, q as ListScriptsParams, {
    query: { enabled: !!slug },
  })
  return { ...result, scripts: result.data?.list ?? [], pagination: result.data?.pagination }
}

/** 平台内置脚本（供「从内置添加」选择）。 */
export function useScriptBuiltins(slug: string, q: ListQuery = { size: 100 }) {
  const result = useListScriptBuiltins(slug, q as ListScriptBuiltinsParams, {
    query: { enabled: !!slug },
  })
  return { ...result, builtins: result.data?.list ?? [] }
}

/** 从内置脚本复制一份到当前租户库。 */
export function useCopyScriptFromBuiltin(slug: string) {
  return useAdminMutation({
    mutationFn: (builtinId: number) => copyScriptFromBuiltin(slug, builtinId),
    successMsg: "已添加到脚本库",
    invalidateKeys: [getListScriptsQueryKey(slug)],
  })
}

export function useCreateScript(slug: string) {
  return useAdminMutation({
    mutationFn: (req: CreateScriptBody) => createScript(slug, req),
    successMsg: "脚本创建成功",
    invalidateKeys: [getListScriptsQueryKey(slug)],
  })
}

export function useUpdateScript(slug: string) {
  return useAdminMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateScriptBody }) => updateScript(slug, id, req),
    successMsg: "脚本已更新",
    invalidateKeys: [getListScriptsQueryKey(slug)],
  })
}

export function useDeleteScript(slug: string) {
  return useAdminMutation({
    mutationFn: (id: number) => deleteScript(slug, id),
    successMsg: "脚本已删除",
    invalidateKeys: [getListScriptsQueryKey(slug)],
  })
}
