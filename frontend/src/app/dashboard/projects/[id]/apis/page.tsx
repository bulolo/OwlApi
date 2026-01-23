import ApisClientPage from "./ApisClientPage"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ApisClientPage projectId={id} />
}
