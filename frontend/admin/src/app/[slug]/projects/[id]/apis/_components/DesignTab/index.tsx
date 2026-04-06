"use client"

import { useEndpointStore } from "../../_store/useEndpointStore"
import { useTenantProject } from "../../_hooks/useTenantProject"
import { SqlEditorCard } from "./SqlEditorCard"
import { ParamDefCard } from "./ParamDefCard"
import { FeedbackBanner } from "./FeedbackBanner"

export function DesignTab() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <FeedbackBanner />

      {/* SQL + Params Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SqlEditorCard />
        <ParamDefCard />
      </div>
    </div>
  )
}
