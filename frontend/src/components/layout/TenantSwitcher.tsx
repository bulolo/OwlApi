"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ChevronsUpDown, Building2, Check } from "lucide-react"
import { useUIStore } from "@/store/useUIStore"
import { useTenantStore } from "@/store/useTenantStore"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function TenantSwitcher({ slug }: { slug?: string }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { activeTenant: storeTenant, setActiveTenant } = useUIStore()
  
  const activeTenant = slug !== 'system' ? (slug || storeTenant) : storeTenant
  const { tenants, fetchTenants, markTenantAsRecent } = useTenantStore()
  
  useEffect(() => {
    setMounted(true)
    fetchTenants()
  }, [])

  const currentTenantObj = tenants.find(t => t.slug === activeTenant) || tenants[0]

  // Safe Hydration: Render a static placeholder that looks identical to the real trigger
  // to prevent Radix ID mismatches during hydration.
  if (!mounted) {
    return (
      <Button 
        variant="outline" 
        className="w-[200px] justify-between h-9 bg-zinc-50/50 border-zinc-200 text-zinc-600 font-normal px-3 pointer-events-none"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center shrink-0">
             <Building2 className="w-3 h-3 text-blue-600" />
          </span>
          <span className="truncate text-xs font-bold">{currentTenantObj?.name || '正在加载...'}</span>
        </span>
        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          role="combobox"
          className="w-[200px] justify-between h-9 bg-zinc-50/50 border-zinc-200 hover:bg-white hover:text-zinc-900 text-zinc-600 font-normal px-3"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center shrink-0">
               <Building2 className="w-3 h-3 text-blue-600" />
            </span>
            <span className="truncate text-xs font-bold">{currentTenantObj?.name || '选择租户'}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px] p-0" align="start">
        <DropdownMenuLabel className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-3 py-2">
          切换租户
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[300px] overflow-y-auto p-1">
          {tenants.map((tenant) => (
            <DropdownMenuItem
              key={tenant.id}
              onClick={() => {
                markTenantAsRecent(tenant.id)
                router.push(`/${tenant.slug}/overview`)
              }}
              className="text-xs font-medium py-2 px-2 cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                <div className={cn(
                  "w-6 h-6 rounded flex items-center justify-center shrink-0",
                  activeTenant === tenant.slug ? "bg-blue-600 text-white" : "bg-zinc-100 text-zinc-400"
                )}>
                  {activeTenant === tenant.slug ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className={cn("truncate flex-1", activeTenant === tenant.slug && "text-blue-600")}>
                  {tenant.name}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
