"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Database, Plus, Search, Trash2, Server, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useUIStore } from "@/store/useUIStore"
import { apiListDataSources, apiListGateways, apiDeleteDataSource, type DataSource, type Gateway } from "@/lib/api-client"
import { cn } from "@/lib/utils"

const DB_TYPE_COLORS: Record<string, string> = {
  mysql: "text-blue-600 border-blue-100 bg-blue-50/30",
  postgres: "text-indigo-600 border-indigo-100 bg-indigo-50/30",
  sqlserver: "text-red-600 border-red-100 bg-red-50/30",
  starrocks: "text-amber-600 border-amber-100 bg-amber-50/30",
  doris: "text-emerald-600 border-emerald-100 bg-emerald-50/30",
  sqlite: "text-zinc-600 border-zinc-100 bg-zinc-50/30",
}

const DB_TYPE_LABELS: Record<string, string> = {
  mysql: "MySQL", postgres: "PostgreSQL", sqlserver: "SQL Server",
  starrocks: "StarRocks", doris: "Doris", sqlite: "SQLite",
}

export default function DataSourcesClientPage() {
  const { activeTenant } = useUIStore()
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!activeTenant) return
    try {
      setLoading(true)
      const [dsData, gwData] = await Promise.all([
        apiListDataSources(activeTenant),
        apiListGateways(activeTenant),
      ])
      setDataSources(dsData.list || [])
      setGateways(gwData.list || [])
    } catch (err) {
      console.error("Failed to fetch data sources", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [activeTenant])

  const handleDelete = async (ds: DataSource) => {
    if (!confirm(`确定要删除数据源 "${ds.name} (${ds.envs?.[0]?.env || "default"})" 吗？`)) return
    try {
      await apiDeleteDataSource(activeTenant, ds.id)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const getGatewayName = (ds: DataSource) => {
    const env = ds.envs?.[0]
    if (!env) return "-"
    return gateways.find(g => g.id === env.gateway_id)?.name || "-"
  }

  const filtered = dataSources.filter(ds =>
    ds.name.toLowerCase().includes(search.toLowerCase()) ||
    ds.type.toLowerCase().includes(search.toLowerCase())
  )

  // 判断某个数据源是否属于多环境
  const isDualEnv = (ds: DataSource) => ds.is_dual

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">数据源管理</h1>
          <p className="text-sm text-zinc-500 mt-1 font-medium">通过网关节点实现跨网络数据库安全接入</p>
        </div>
        <Link href={`/${activeTenant}/data-sources/new`}>
          <Button className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95">
            <Plus className="w-4 h-4 mr-2" /> 接入新数据源
          </Button>
        </Link>
      </div>

      <div className="bg-white border border-zinc-100 rounded-lg p-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input placeholder="通过名称或类型检索数据源..." className="pl-9 h-9 text-xs bg-zinc-50 border-zinc-100 rounded-lg" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-400 text-sm">加载中...</div>
      ) : filtered.length === 0 && !search ? (
        <div className="text-center py-20">
          <Database className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">暂无数据源</p>
          <p className="text-zinc-400 text-xs mt-1">点击「接入新数据源」创建第一个数据源</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((ds) => (
            <Card key={ds.id} className="bg-white border-zinc-100 rounded-lg shadow-sm hover:shadow-md hover:border-blue-600/30 transition-all duration-300 flex flex-col h-full overflow-hidden group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center border shadow-sm", DB_TYPE_COLORS[ds.type] || "text-zinc-600 border-zinc-100 bg-zinc-50/30")}>
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="flex gap-1.5">
                    {isDualEnv(ds) && (
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tight",
                        ds.envs?.[0]?.env === "prod" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                      )}>
                        {ds.envs?.[0]?.env || "default"}
                      </div>
                    )}
                    <div className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tight bg-zinc-50 text-zinc-500 border-zinc-100">
                      {DB_TYPE_LABELS[ds.type] || ds.type}
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-zinc-900 group-hover:text-blue-600 transition-colors tracking-tight">{ds.name}</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide mt-1">ID: {ds.id} • {new Date(ds.created_at).toLocaleDateString()}</p>
              </div>
              <div className="mt-auto px-6 py-4 border-t border-zinc-100 bg-zinc-50/10 flex items-center justify-between">
                <div className="flex items-center text-[10px] font-bold text-zinc-500">
                  <Server className="w-3.5 h-3.5 mr-2 text-blue-500" /> {getGatewayName(ds)}
                </div>
                <div className="flex gap-1">
                  <Link href={`/${activeTenant}/data-sources/edit/${ds.id}`}>
                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-blue-50 hover:text-blue-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500" onClick={() => handleDelete(ds)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          <Link href={`/${activeTenant}/data-sources/new`} className="group">
            <div className="border-2 border-dashed border-zinc-200 rounded-lg flex flex-col items-center justify-center p-6 bg-zinc-50/20 hover:bg-white hover:border-blue-600/30 hover:shadow-sm transition-all cursor-pointer h-full min-h-[220px]">
              <div className="w-12 h-12 rounded-lg border border-zinc-100 flex items-center justify-center mb-4 bg-white shadow-sm group-hover:scale-110 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all duration-300">
                <Plus className="w-6 h-6 text-zinc-300 group-hover:text-white" />
              </div>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-wide">接入新数据源</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
