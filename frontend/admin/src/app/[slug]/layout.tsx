"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { useEffect, use } from "react"
import { useUIStore } from "@/store/useUIStore"
import { useAuthStore } from "@/store/useAuthStore"
import { TenantProvider } from "@/providers/TenantProvider"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { setViewContext, sidebarCollapsed } = useUIStore()
  const { restoreSession } = useAuthStore()
  const { slug } = use(params)

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  useEffect(() => {
    if (slug) {
      setViewContext(slug === 'system' ? 'SYSTEM' : 'TENANT')
    }
  }, [slug, setViewContext])

  const isTenantView = slug ? slug !== 'system' : false

  return (
    <TenantProvider slug={slug}>
      <div className="min-h-screen bg-background flex text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-hidden">
        {isTenantView && <Sidebar slug={slug} />}
        <div className={cn(
          "flex-1 flex flex-col min-h-screen min-w-0",
          isTenantView ? (sidebarCollapsed ? "lg:pl-[60px]" : "lg:pl-56") : "pl-0"
        )}>
          <Header slug={slug} />
          <main className="flex-1 p-8 max-w-[1600px] w-full mx-auto min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
        <ConfirmDialog />
      </div>
    </TenantProvider>
  )
}
