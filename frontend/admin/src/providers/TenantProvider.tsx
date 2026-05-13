"use client"

import { createContext, useContext } from "react"

const TenantContext = createContext<string>("")

export function TenantProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  return <TenantContext.Provider value={slug}>{children}</TenantContext.Provider>
}

export function useTenant(): string {
  return useContext(TenantContext)
}
