"use client"

import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex text-zinc-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64 transition-all duration-300 ease-in-out">
        <Header />
        
        <main className="flex-1 p-8 max-w-[1600px] w-full mx-auto animate-in fade-in duration-500 slide-in-from-bottom-2">
          {children}
        </main>
      </div>
    </div>
  )
}

