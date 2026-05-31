import { useQuery } from "@tanstack/react-query"
import type { PaginationInfo } from "@/lib/sdk"

type PaginatedData<T> = { list: T[]; pagination: PaginationInfo }

/**
 * Wraps useQuery for paginated list endpoints.
 * Returns `list` and `pagination` in addition to the standard query fields.
 */
export function usePaginatedQuery<T>(
  queryKey: unknown[],
  queryFn: () => Promise<PaginatedData<T>>,
  enabled = true,
) {
  const query = useQuery({ queryKey, queryFn, enabled })
  return {
    ...query,
    list: query.data?.list ?? [],
    pagination: query.data?.pagination,
  }
}
