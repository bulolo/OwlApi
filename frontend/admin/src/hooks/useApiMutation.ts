import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

/**
 * 通用 mutation hook — 自动 toast + invalidate
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (vars: TVariables) => Promise<TData>,
  options?: {
    successMessage?: string
    errorMessage?: string
    invalidateKeys?: string[][]
  },
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (options?.successMessage) toast.success(options.successMessage)
      options?.invalidateKeys?.forEach((key) => qc.invalidateQueries({ queryKey: key }))
    },
    onError: (err: Error) => {
      toast.error(options?.errorMessage || err.message || "操作失败")
    },
  })
}
