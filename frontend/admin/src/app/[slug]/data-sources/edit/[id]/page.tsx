"use client"

import { use } from "react"
import NewDataSourceClientPage from "../../new/NewDataSourceClientPage"

export default function EditDataSourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <NewDataSourceClientPage datasourceId={Number(id)} />
}
