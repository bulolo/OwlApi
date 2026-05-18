// 这条路由只是 Next.js 的路由入口；EE 模式下渲染真实的组织管理页，
// CE 模式下会被 sync-ce 替换为 stub（友好的"该功能仅企业版支持"占位）。
import Tenants from "@/ee/pages/Tenants"

export const metadata = {
  title: "组织管理 | OwlAPI",
}

export default function TenantsPage() {
  return <Tenants />
}
