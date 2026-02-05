"use client"

import { useState } from "react"
import { useProjectStore } from "@/store/useProjectStore"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database, Table, Search, RefreshCcw, Filter, Download } from "lucide-react"
import { cn } from "@/lib/utils"

export default function DatabaseClientPage({ projectId }: { projectId: string }) {
  const { mockTables } = useProjectStore()
  const [selectedTable, setSelectedTable] = useState(mockTables[0]?.name)

  const activeTable = mockTables.find(t => t.name === selectedTable)

  return (
    <div className="grid grid-cols-12 gap-5 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Table List Sidebar */}
      <div className="col-span-3 flex flex-col bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-zinc-50/50 flex flex-col space-y-3">
          <div className="flex items-center space-x-2 px-1">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Database Schema</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
            <input
              placeholder="Filter entities..."
              className="w-full pl-7 h-7 text-[11px] bg-white border border-zinc-200 rounded outline-none focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto divide-y divide-zinc-50 py-1">
          {mockTables.map((table) => (
            <div
              key={table.name}
              onClick={() => setSelectedTable(table.name)}
              className={cn(
                "px-4 py-2.5 cursor-pointer transition-all flex items-center space-x-3 group",
                selectedTable === table.name ? "bg-blue-50 text-blue-700 font-bold" : "text-zinc-500 hover:bg-zinc-50"
              )}
            >
              <Table className={cn("w-3.5 h-3.5", selectedTable === table.name ? "text-blue-600" : "text-zinc-300")} />
              <span className="text-xs truncate">{table.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table Data View */}
      <div className="col-span-9 flex flex-col border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="h-11 border-b px-4 flex items-center justify-between bg-zinc-50/30">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-zinc-800">{selectedTable}</span>
            <span className="text-[10px] text-zinc-400 bg-white border px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
              {activeTable?.data.length || 0} Rows
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded hover:bg-zinc-200">
              <RefreshCcw className="w-3 h-3 text-zinc-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded hover:bg-zinc-200">
              <Download className="w-3 h-3 text-zinc-500" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white custom-scrollbar">
          {activeTable ? (
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200 z-10">
                <tr>
                  {activeTable.columns.map((col) => (
                    <th key={col} className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wide border-r border-zinc-100 last:border-0 whitespace-nowrap">
                      <div className="flex items-center justify-between group">
                        {col}
                        <Filter className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {activeTable.data.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/20 transition-colors">
                    {activeTable.columns.map((col) => (
                      <td key={col} className="px-4 py-2.5 text-[11px] text-zinc-600 border-r border-zinc-50 last:border-0 font-medium whitespace-nowrap">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
              <Database className="w-12 h-12 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">No data mapped</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
