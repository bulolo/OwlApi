"use client"

import { use } from "react"
import ProjectFormPage from "../../register/page"

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ProjectFormPage projectId={Number(id)} />
}
