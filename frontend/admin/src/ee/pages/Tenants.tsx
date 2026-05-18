// CE 占位：原 EE 实现是组织（租户）管理列表。
// 社区版本身是单租户运行模型，不暴露跨租户管理；
// 这里渲染一个清晰的"升级到企业版"提示页，避免 /tenants 路由 404。
import { Building2 } from "lucide-react"

// Props 签名跟 src/ee/pages/Tenants.tsx 保持一致
interface TenantsProps {
  onClose?: () => void
}

export default function Tenants({}: TenantsProps = {}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-16 bg-white">
      <div className="w-16 h-16 rounded-lg bg-zinc-50 border border-border-subtle flex items-center justify-center mb-6">
        <Building2 className="w-8 h-8 text-zinc-300" />
      </div>
      <h3 className="text-lg font-bold text-foreground tracking-tight mb-2">组织管理</h3>
      <p className="text-sm text-muted-foreground max-w-sm font-medium leading-relaxed mb-6">
        多组织 / 跨租户管理是 <strong className="text-foreground">Enterprise Edition</strong> 功能。
        社区版以单租户模式运行，本页不可用。
      </p>
      <a
        href="https://owlapi.cn/enterprise"
        target="_blank"
        rel="noreferrer"
        className="text-xs font-bold text-primary hover:underline"
      >
        了解企业版 →
      </a>
    </div>
  )
}
