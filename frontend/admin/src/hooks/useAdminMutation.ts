import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { UseMutationOptions, MutationFunctionContext } from "@tanstack/react-query"
import { toast } from "sonner"

interface UseAdminMutationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  successMsg?: string | ((data: TData, variables: TVariables) => string | undefined)
  errorMsg?: string | ((error: TError, variables: TVariables) => string | undefined)
  invalidateKeys?: ReadonlyArray<ReadonlyArray<unknown>>
}

export function useAdminMutation<TData = unknown, TError = Error, TVariables = unknown, TContext = unknown>(
  options: UseAdminMutationOptions<TData, TError, TVariables, TContext>
) {
  const queryClient = useQueryClient()
  const { successMsg, errorMsg, invalidateKeys, onSuccess, onError, ...mutationOptions } = options

  return useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    onSuccess: async (data: TData, variables: TVariables, onMutateResult: TContext, ctx: MutationFunctionContext) => {
      if (invalidateKeys && invalidateKeys.length > 0) {
        await Promise.all(
          invalidateKeys.map(key => queryClient.invalidateQueries({ queryKey: key as unknown[] }))
        )
      }
      if (onSuccess) {
        await onSuccess(data, variables, onMutateResult, ctx)
      }
      if (successMsg) {
        const msg = typeof successMsg === 'function' ? successMsg(data, variables) : successMsg
        if (msg) toast.success(msg)
      }
    },
    onError: async (error: TError, variables: TVariables, onMutateResult: TContext | undefined, ctx: MutationFunctionContext) => {
      if (onError) {
        await onError(error, variables, onMutateResult, ctx)
      }
      const message = (error as Error)?.message || '操作失败'
      const msg = typeof errorMsg === 'function' ? errorMsg(error, variables) : (errorMsg || message)
      if (msg) toast.error(msg)
    },
  })
}
