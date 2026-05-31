import { Suspense } from "react"
import Apis from "./Apis"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await params
  return (
    <Suspense>
      <Apis />
    </Suspense>
  )
}
