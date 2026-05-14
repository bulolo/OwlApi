import ProjectLayout from "./ProjectLayout"

export default async function ProjectLayoutWrapper({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <ProjectLayout projectId={id}>
      {children}
    </ProjectLayout>
  )
}
