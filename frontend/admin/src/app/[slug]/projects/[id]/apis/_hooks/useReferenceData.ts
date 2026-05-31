import { useListDataSources, useListScripts } from "@/lib/sdk"

export function useReferenceData(slug: string) {
  const { data: dsData } = useListDataSources(slug, undefined, {
    query: { enabled: !!slug, staleTime: 5 * 60 * 1000 },
  })
  const { data: scriptData } = useListScripts(slug, undefined, {
    query: { enabled: !!slug, staleTime: 5 * 60 * 1000 },
  })
  return {
    dataSources: dsData?.list ?? [],
    scripts: scriptData?.list ?? [],
  }
}
