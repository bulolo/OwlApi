import { useQuery } from "@tanstack/react-query"
import { getDatasourceSchema } from "@/lib/sdk"

export interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
}

export interface SchemaTable {
  name: string
  columns: SchemaColumn[]
}

const cast = <T>(p: unknown): Promise<T> => p as Promise<T>

async function fetchSchema(slug: string, datasourceId: number): Promise<SchemaTable[]> {
  return cast<SchemaTable[]>(getDatasourceSchema({ path: { slug, datasourceId } }))
}

export function useSchemaQuery(slug: string, datasourceId: number) {
  return useQuery({
    queryKey: ["schema", slug, datasourceId],
    queryFn: () => fetchSchema(slug, datasourceId),
    enabled: !!slug && !!datasourceId,
    staleTime: 2 * 60 * 1000,
  })
}
