"use client"

import { use } from "react"
import ProjectFormPage from "../../new/page"

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ProjectFormPage projectId={Number(id)} />
}
