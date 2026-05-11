import { useQuery } from "@tanstack/react-query"
import { apiListDataSources, apiListScripts } from "@/lib/api-client"

export function useReferenceData(slug: string) {
  const { data: dsData } = useQuery({
    queryKey: ["datasources", slug],
    queryFn: () => apiListDataSources(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })
  const { data: scriptData } = useQuery({
    queryKey: ["scripts", slug],
    queryFn: () => apiListScripts(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })
  return {
    dataSources: dsData?.list ?? [],
    scripts: scriptData?.list ?? [],
  }
}
