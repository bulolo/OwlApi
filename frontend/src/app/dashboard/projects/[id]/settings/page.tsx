import SettingsClientPage from "./SettingsClientPage"

export const metadata = {
  title: "项目设置 | OwlAPI",
}

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SettingsClientPage projectId={id} />
}
