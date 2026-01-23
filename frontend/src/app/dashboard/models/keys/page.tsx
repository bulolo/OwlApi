"use client"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Copy, Trash2, Key, ShieldAlert } from "lucide-react"

const MOCK_KEYS = [
  { id: "sk-owl-283...a9d", name: "Development Key", created: "2024-03-20", lastUsed: "Just now", status: "active" },
  { id: "sk-owl-992...b2x", name: "Production - Mobile App", created: "2024-03-15", lastUsed: "2h ago", status: "active" },
  { id: "sk-owl-112...c9z", name: "Test Key (Expired)", created: "2024-02-01", lastUsed: "1mo ago", status: "revoked" },
]

export default function ApiKeysPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
       <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            API Keys
          </h2>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
             管理用于访问 AI 模型网关的鉴权密钥。请勿泄露您的密钥。
          </p>
        </div>
        <Button className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm">
          <Plus className="w-3.5 h-3.5 mr-2" />
          新建密钥
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-zinc-50/50 bg-zinc-50/30">
              <TableHead className="w-[300px] text-xs font-bold text-zinc-500 uppercase">Key Token</TableHead>
              <TableHead className="text-xs font-bold text-zinc-500 uppercase">Name</TableHead>
              <TableHead className="text-xs font-bold text-zinc-500 uppercase">Created</TableHead>
              <TableHead className="text-xs font-bold text-zinc-500 uppercase">Last Used</TableHead>
              <TableHead className="text-xs font-bold text-zinc-500 uppercase">Status</TableHead>
              <TableHead className="text-right text-xs font-bold text-zinc-500 uppercase">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_KEYS.map((key) => (
              <TableRow key={key.id} className="group hover:bg-blue-50/5 transition-colors">
                <TableCell className="font-mono text-xs font-medium text-zinc-600">
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-zinc-300 group-hover:text-blue-500 transition-colors" />
                    {key.id}
                    <Copy className="w-3 h-3 text-zinc-300 cursor-pointer hover:text-zinc-600" />
                  </div>
                </TableCell>
                <TableCell className="text-sm font-medium text-zinc-900">{key.name}</TableCell>
                <TableCell className="text-xs text-zinc-500">{key.created}</TableCell>
                <TableCell className="text-xs text-zinc-500">{key.lastUsed}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`
                    ${key.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}
                    capitalize font-bold tracking-tight px-2 py-0.5 rounded-md
                  `}>
                    {key.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

       <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
           <h4 className="text-sm font-bold text-amber-900">安全提示</h4>
           <p className="text-xs text-amber-700 mt-1 leading-relaxed">
             API Key 具有调用内网模型的权限，请勿将其提交到公共代码仓库。
             如果发现密钥泄露，请立即撤销并生成新的密钥。所有调用均会被审计记录。
           </p>
        </div>
      </div>
    </div>
  )
}
