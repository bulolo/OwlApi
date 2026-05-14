import DataSourceEditor from "../../_components/DataSourceEditor"

export const metadata = {
  title: "编辑数据源 | OwlAPI",
}

export default async function EditDataSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DataSourceEditor datasourceId={Number(id)} />
}
