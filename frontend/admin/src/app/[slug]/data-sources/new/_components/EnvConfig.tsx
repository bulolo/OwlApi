"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Server, Globe, ShieldCheck, Loader2, Zap, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { defaultPort, type ConnParams } from "@/lib/database-helpers"
import type { Gateway } from "@/lib/api-client"

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnvData = ConnParams & { sqlitePath: string; gatewayId: number }
export type TestStatus = 'untested' | 'testing' | 'ok' | 'fail'
export interface EnvTestState { status: TestStatus; latencyMs?: number; error?: string }

// ─── ConnFields ───────────────────────────────────────────────────────────────

interface ConnFieldsProps {
  type: string
  env: EnvData
  showPass: boolean
  onTogglePass: () => void
  onChange: (upd: Partial<EnvData>) => void
}

export function ConnFields({ type, env, showPass, onTogglePass, onChange }: ConnFieldsProps) {
  const labelCls = "text-2xs font-bold text-muted-foreground uppercase tracking-wider"
  const inputCls = "h-9 text-sm border-border shadow-none focus-visible:ring-1"

  if (type === 'sqlite') {
    return (
      <div className="col-span-2 space-y-2">
        <Label className={labelCls}>数据库文件路径</Label>
        <Input
          placeholder="/data/mydb.db"
          value={env.sqlitePath}
          onChange={e => onChange({ sqlitePath: e.target.value })}
          className={cn(inputCls, "font-mono text-xs")}
        />
        <p className="text-2xs text-muted-foreground">填写 Gateway 容器内的绝对路径，需通过 Docker volume 挂载宿主机目录</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <Label className={labelCls}>主机 / Host</Label>
        <Input placeholder="127.0.0.1" value={env.host} onChange={e => onChange({ host: e.target.value })} className={inputCls} />
      </div>
      <div className="space-y-2">
        <Label className={labelCls}>端口 / Port</Label>
        <Input placeholder={defaultPort(type)} value={env.port} onChange={e => onChange({ port: e.target.value })} className={inputCls} />
      </div>
      <div className="space-y-2">
        <Label className={labelCls}>用户名 / User</Label>
        <Input placeholder="root" value={env.user} onChange={e => onChange({ user: e.target.value })} className={inputCls} />
      </div>
      <div className="space-y-2">
        <Label className={labelCls}>密码 / Password</Label>
        <div className="relative">
          <Input
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••"
            value={env.password}
            onChange={e => onChange({ password: e.target.value })}
            className={cn(inputCls, "pr-9")}
          />
          <button
            type="button"
            onClick={onTogglePass}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-zinc-600 transition-colors"
          >
            {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      <div className="col-span-2 space-y-2">
        <Label className={labelCls}>数据库名 / Database</Label>
        <Input placeholder="mydb" value={env.database} onChange={e => onChange({ database: e.target.value })} className={inputCls} />
      </div>
    </>
  )
}

// ─── ConnTestPanel ────────────────────────────────────────────────────────────

interface ConnTestPanelProps {
  envKey: 'prod' | 'dev'
  state: EnvTestState
  onTest: (env: 'prod' | 'dev') => void
}

export function ConnTestPanel({ envKey, state, onTest }: ConnTestPanelProps) {
  const isOk      = state.status === 'ok'
  const isFail    = state.status === 'fail'
  const isTesting = state.status === 'testing'
  return (
    <div className="flex items-center gap-3 pt-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isTesting}
        onClick={() => onTest(envKey)}
        className={cn(
          "h-8 px-4 text-xs font-bold border transition-colors",
          isOk   ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" :
          isFail ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100" :
                   "border-border text-zinc-600 hover:bg-zinc-50",
        )}
      >
        {isTesting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Zap className="w-3 h-3 mr-1.5" />}
        {isTesting ? '测试中...' : '测试连接'}
      </Button>
      {isOk && (
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          连接成功 · {state.latencyMs}ms
        </span>
      )}
      {isFail && (
        <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 max-w-xs truncate" title={state.error}>
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {state.error ?? '连接失败'}
        </span>
      )}
    </div>
  )
}

// ─── EnvCard ─────────────────────────────────────────────────────────────────

interface EnvCardProps {
  envKey: 'prod' | 'dev'
  type: string
  env: EnvData
  testState: EnvTestState
  gateways: Gateway[]
  effectiveGwId: number
  showPass: boolean
  onTogglePass: () => void
  onChange: (upd: Partial<EnvData>) => void
  onTest: (env: 'prod' | 'dev') => void
  /** Card accent: 'emerald' for DEV, 'blue' for PROD */
  accent: 'emerald' | 'blue'
  title: string
  subtitle: string
}

export function EnvCard({
  envKey, type, env, testState, gateways, effectiveGwId,
  showPass, onTogglePass, onChange, onTest,
  accent, title, subtitle,
}: EnvCardProps) {
  const accentBar  = accent === 'emerald' ? 'bg-emerald-500' : 'bg-primary'
  const iconBg     = accent === 'emerald' ? 'bg-emerald-50 border-emerald-100' : 'bg-primary/10 border-primary/20'
  const iconColor  = accent === 'emerald' ? 'text-emerald-600' : 'text-primary'
  const triggerBg  = accent === 'emerald'
    ? 'bg-white hover:bg-zinc-50'
    : 'bg-primary/10 hover:bg-primary/10'
  const serverIcon = accent === 'emerald' ? 'text-emerald-500' : 'text-primary/80'

  return (
    <div className="p-6 border border-border-subtle rounded-xl shadow-card overflow-hidden relative bg-white">
      <div className={`absolute top-0 left-0 w-1 h-full ${accentBar}`} />
      <div className="flex items-center gap-3 mb-8">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${iconBg}`}>
          {accent === 'emerald'
            ? <Globe className={`w-4 h-4 ${iconColor}`} />
            : <ShieldCheck className={`w-4 h-4 ${iconColor}`} />
          }
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground uppercase">{title}</h3>
          <p className="text-2xs text-muted-foreground font-bold uppercase tracking-tight">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <ConnFields
          type={type}
          env={env}
          showPass={showPass}
          onTogglePass={onTogglePass}
          onChange={onChange}
        />
        <div className="col-span-2 space-y-2">
          <Label className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">绑定网关节点 (Gateway Node)</Label>
          <Select
            value={String(effectiveGwId)}
            onValueChange={v => onChange({ gatewayId: Number(v) })}
          >
            <SelectTrigger className={`h-9 border-border ${triggerBg} transition-colors`}>
              <SelectValue placeholder="选择网关节点..." />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {gateways.map(gw => (
                <SelectItem key={gw.id} value={String(gw.id)} className="focus:bg-zinc-50">
                  <div className="flex items-center">
                    <Server className={cn("w-3.5 h-3.5 mr-2", gw.status === 'online' ? serverIcon : "text-zinc-300")} />
                    <span className="font-bold">{gw.name}</span>
                    {gw.ip && <span className="ml-2 text-2xs text-muted-foreground font-mono px-1.5 py-0.5 bg-zinc-100 rounded tracking-tight">{gw.ip}</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <ConnTestPanel envKey={envKey} state={testState} onTest={onTest} />
        </div>
      </div>
    </div>
  )
}
