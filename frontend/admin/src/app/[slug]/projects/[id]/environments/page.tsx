import Environments from "./Environments"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <Environments projectId={Number(id)} />
}
