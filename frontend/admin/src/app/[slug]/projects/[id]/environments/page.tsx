import EnvironmentsClientPage from "./EnvironmentsClientPage"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EnvironmentsClientPage projectId={Number(id)} />
}
