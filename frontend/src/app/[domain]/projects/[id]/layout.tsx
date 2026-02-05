import ProjectLayoutContent from "./ProjectLayoutContent"

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <ProjectLayoutContent projectId={id}>
      {children}
    </ProjectLayoutContent>
  )
}
