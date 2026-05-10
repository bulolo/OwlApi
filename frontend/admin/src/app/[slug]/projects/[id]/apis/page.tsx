import ApisClientPage from "./ApisClientPage"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await params
  return <ApisClientPage />
}
