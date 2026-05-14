import Apis from "./Apis"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await params
  return <Apis />
}
