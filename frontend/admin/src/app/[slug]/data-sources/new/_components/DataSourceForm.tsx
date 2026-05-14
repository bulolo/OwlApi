"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, ShieldCheck } from "lucide-react"
import { DB_TYPES } from "@/lib/constants"

type DbType = keyof typeof DB_TYPES

interface DataSourceFormProps {
  name: string
  type: DbType
  isDual: boolean
  onNameChange: (v: string) => void
  onTypeChange: (v: DbType) => void
  onIsDualChange: (v: boolean) => void
}

export function DataSourceForm({
  name, type, isDual,
  onNameChange, onTypeChange, onIsDualChange,
}: DataSourceFormProps) {
  return (
    <>
      <Card className="p-6 border-border-subtle shadow-card relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2">
          <Badge variant="secondary" className="bg-zinc-100 text-muted-foreground border-none text-2xs font-bold">CONFIG</Badge>
        </div>
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-6 flex items-center">
          <Info className="w-4 h-4 mr-2 text-primary/80" />基础配置
        </h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
              <span>数据源名称</span>
              <span className="text-2xs text-zinc-300 font-bold">REQUIRED</span>
            </Label>
            <Input
              placeholder="例如：核心业务从库"
              value={name}
              onChange={e => onNameChange(e.target.value)}
              className="h-9 text-sm focus:ring-1 border-border shadow-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">数据库类型</Label>
            <Select value={type} onValueChange={v => onTypeChange(v as DbType)}>
              <SelectTrigger className="h-9 text-sm border-border shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DB_TYPES).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-4 border-t border-border-subtle">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">多环境支持</Label>
              <Switch checked={isDual} onCheckedChange={onIsDualChange} />
            </div>
            <p className="text-2xs text-muted-foreground leading-relaxed">
              开启后可分别配置 开发(DEV) 和 生产(PROD) 两个独立节点与地址。
            </p>
          </div>
        </div>
      </Card>

      <div className="p-5 bg-primary/10 border border-primary/20 rounded-lg shadow-sm">
        <h4 className="text-xs font-bold text-primary uppercase tracking-wide mb-2 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" />安全与合规
        </h4>
        <p className="text-xs text-primary/80 leading-relaxed font-medium">
          OwlAPI 采用<strong>隧道穿透</strong>技术。您的数据库凭据在浏览器端脱敏，仅在网关节点内部加密存储。
        </p>
      </div>
    </>
  )
}
