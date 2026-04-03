"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { useEffect, use } from "react"
import { useUIStore } from "@/store/useUIStore"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { viewContext, setViewContext, setActiveTenant, activeTenant, restoreSession } = useUIStore()
  const { slug } = use(params)
  
  useEffect(() => {
    restoreSession()
  }, [])

  useEffect(() => {
    if (slug) {
      if (slug === 'system') {
        setViewContext('SYSTEM')
      } else {
        setViewContext('TENANT')
        if (slug !== activeTenant) {
          setActiveTenant(slug)
        }
      }
    }
  }, [slug, setViewContext, setActiveTenant, activeTenant])

  const isTenantView = slug ? slug !== 'system' : false

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex text-zinc-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {isTenantView && <Sidebar slug={slug} />}
      
      <div className={cn(
        "flex-1 flex flex-col min-h-screen",
        isTenantView ? "lg:pl-72" : "pl-0"
      )}>
        <Header slug={slug} />
        
        <main className="flex-1 p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
