"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Server,
  Globe,
  ShieldCheck,
  Info,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTenant } from "@/providers/TenantProvider"
import { useGateways, useDataSource, useCreateDataSource, useUpdateDataSource } from "@/hooks"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { DB_TYPES } from "@/lib/constants"
import { apiTestDatasource } from "@/lib/api-client"
import type { DataSource } from "@/lib/api-client"

// ─── Types ────────────────────────────────────────────────────────────────────

type DbType = keyof typeof DB_TYPES

type TestStatus = 'untested' | 'testing' | 'ok' | 'fail'
interface EnvTestState { status: TestStatus; latencyMs?: number; error?: string }

type ConnParams = { host: string; port: string; user: string; password: string; database: string }
type EnvData = ConnParams & { sqlitePath: string; gatewayId: number }

type FormData = {
  name: string
  type: DbType
  isDual: boolean
  dev: EnvData
  prod: EnvData
}

// ─── DSN helpers ──────────────────────────────────────────────────────────────

function defaultPort(type: string): string {
  if (type === 'postgres') return '5432'
  if (type === 'sqlserver') return '1433'
  if (type === 'starrocks' || type === 'doris') return '9030'
  return '3306'
}

function defaultConn(type: string): ConnParams {
  return { host: '', port: defaultPort(type), user: '', password: '', database: '' }
}

function buildDSN(type: string, p: ConnParams): string {
  switch (type) {
    case 'mysql': case 'starrocks': case 'doris':
      return `${p.user}:${p.password}@tcp(${p.host}:${p.port || defaultPort(type)})/${p.database}`
    case 'postgres':
      return `postgres://${p.user}:${encodeURIComponent(p.password)}@${p.host}:${p.port || '5432'}/${p.database}`
    case 'sqlserver':
      return `sqlserver://${p.user}:${encodeURIComponent(p.password)}@${p.host}:${p.port || '1433'}?database=${p.database}`
    default:
      return ''
  }
}

function buildEnvDSN(type: string, env: EnvData): string {
  if (type === 'sqlite') return env.sqlitePath
  if (!env.host || !env.user || !env.database) return ''
  return buildDSN(type, env)
}

function parseDSN(type: string, dsn: string): ConnParams {
  if (!dsn) return defaultConn(type)
  const safeDecode = (s: string) => { try { return decodeURIComponent(s) } catch { return s } }
  try {
    if (type === 'mysql' || type === 'starrocks' || type === 'doris') {
      const atIdx = dsn.lastIndexOf('@')
      if (atIdx < 0) return defaultConn(type)
      const creds = dsn.slice(0, atIdx)
      const rest = dsn.slice(atIdx + 1)
      const colonIdx = creds.indexOf(':')
      const user = colonIdx >= 0 ? creds.slice(0, colonIdx) : creds
      // "****" is the server's masked password placeholder — clear to empty.
      const rawPass = colonIdx >= 0 ? creds.slice(colonIdx + 1) : ''
      const password = rawPass === '****' ? '' : safeDecode(rawPass)
      const m = rest.match(/^(?:tcp|udp)?\(([^)]+)\)\/([^?]*)/)
      if (!m) return { ...defaultConn(type), user, password }
      const portIdx = m[1].lastIndexOf(':')
      return {
        user, password,
        host: portIdx >= 0 ? m[1].slice(0, portIdx) : m[1],
        port: portIdx >= 0 ? m[1].slice(portIdx + 1) : '3306',
        database: m[2],
      }
    }
    if (type === 'postgres' || type === 'sqlserver') {
      const url = new URL(dsn)
      const rawPass = safeDecode(url.password)
      return {
        host: url.hostname,
        port: url.port || defaultPort(type),
        user: safeDecode(url.username),
        password: rawPass === '****' ? '' : rawPass,
        database: type === 'sqlserver'
          ? (url.searchParams.get('database') || '')
          : url.pathname.slice(1),
      }
    }
  } catch { /* ignore */ }
  return defaultConn(type)
}

function makeEnvData(type: string): EnvData {
  return { ...defaultConn(type), sqlitePath: '', gatewayId: 0 }
}

function deriveFormData(existingDs: DataSource | undefined): FormData {
  if (!existingDs) {
    return { name: '', type: 'mysql', isDual: false, dev: makeEnvData('mysql'), prod: makeEnvData('mysql') }
  }
  const prodEnv = existingDs.envs?.find(e => e.env === 'prod')
  const devEnv  = existingDs.envs?.find(e => e.env === 'dev')
  const type    = (existingDs.type ?? 'mysql') as DbType
  const parsedProd = parseDSN(type, prodEnv?.dsn || '')
  const parsedDev  = parseDSN(type, devEnv?.dsn  || '')
  return {
    name:   existingDs.name ?? '',
    type,
    isDual: existingDs.is_dual ?? false,
    prod: { ...parsedProd, sqlitePath: type === 'sqlite' ? (prodEnv?.dsn || '') : '', gatewayId: prodEnv?.gateway_id || 0 },
    dev:  { ...parsedDev,  sqlitePath: type === 'sqlite' ? (devEnv?.dsn  || '') : '', gatewayId: devEnv?.gateway_id  || 0 },
  }
}

// ─── TestBar ──────────────────────────────────────────────────────────────────

function TestBar({
  envKey,
  state,
  onTest,
}: {
  envKey: 'prod' | 'dev'
  state: EnvTestState
  onTest: (env: 'prod' | 'dev') => void
}) {
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
          "h-8 px-4 text-[11px] font-bold border transition-colors",
          isOk   ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" :
          isFail ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100" :
                   "border-zinc-200 text-zinc-600 hover:bg-zinc-50",
        )}
      >
        {isTesting ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Zap className="w-3 h-3 mr-1.5" />}
        {isTesting ? '测试中...' : '测试连接'}
      </Button>
      {isOk && (
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          连接成功 · {state.latencyMs}ms
        </span>
      )}
      {isFail && (
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 max-w-xs truncate" title={state.error}>
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {state.error ?? '连接失败'}
        </span>
      )}
    </div>
  )
}

// ─── ConnFields ───────────────────────────────────────────────────────────────

function ConnFields({
  type,
  env,
  showPass,
  onTogglePass,
  onChange,
}: {
  type: string
  env: EnvData
  showPass: boolean
  onTogglePass: () => void
  onChange: (upd: Partial<EnvData>) => void
}) {
  const labelCls = "text-[10px] font-bold text-zinc-400 uppercase tracking-wider"
  const inputCls = "h-9 text-sm border-zinc-200 shadow-none focus-visible:ring-1"

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
        <p className="text-[10px] text-zinc-400">填写 Gateway 容器内的绝对路径，需通过 Docker volume 挂载宿主机目录</p>
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
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

// ─── Inner form ───────────────────────────────────────────────────────────────
// Receives existingDs as a prop and initialises all state synchronously, so
// no useEffect is needed for data population. The outer shell passes a stable
// key so this component only ever mounts once per datasource.

function DataSourceForm({
  datasourceId,
  existingDs,
}: {
  datasourceId?: number
  existingDs?: DataSource
}) {
  const activeTenant = useTenant()
  const router = useRouter()
  const { gateways } = useGateways(activeTenant, { is_pager: 0 })
  const createMutation = useCreateDataSource(activeTenant)
  const updateMutation = useUpdateDataSource(activeTenant, datasourceId ?? 0)
  const isEdit = !!datasourceId
  const saving = createMutation.isPending || updateMutation.isPending

  // Synchronous state initialisation from existingDs — no useEffect required.
  const [formData, setFormData] = useState<FormData>(() => deriveFormData(existingDs))
  const [testState, setTestState] = useState<{ prod: EnvTestState; dev: EnvTestState }>({
    prod: { status: 'untested' },
    dev:  { status: 'untested' },
  })

  // Tracks whether the user has edited connection-specific fields for each env.
  // In edit mode starts false (credentials kept server-side unless overridden).
  const [connChanged, setConnChanged] = useState(() => ({ prod: !isEdit, dev: !isEdit }))

  const [showProdPass, setShowProdPass] = useState(false)
  const [showDevPass,  setShowDevPass]  = useState(false)

  const resetTest = (env: 'prod' | 'dev') =>
    setTestState(prev => ({ ...prev, [env]: { status: 'untested' } }))

  const updateEnv = (env: 'prod' | 'dev', upd: Partial<EnvData>) => {
    const isConnField = Object.keys(upd).some(k => k !== 'gatewayId')
    if (isConnField) {
      resetTest(env)
      setConnChanged(prev => ({ ...prev, [env]: true }))
    }
    setFormData(prev => ({ ...prev, [env]: { ...prev[env], ...upd } }))
  }

  // When no gateway is stored yet and gateways have loaded, the first gateway
  // becomes the effective default. Computed during render — no effect needed.
  const firstGwId = gateways[0]?.id ?? 0
  const effectiveProdGwId = formData.prod.gatewayId || (!isEdit ? firstGwId : 0)
  const effectiveDevGwId  = formData.dev.gatewayId  || (!isEdit ? firstGwId : 0)

  const handleTest = async (env: 'prod' | 'dev') => {
    const envData = env === 'prod' ? formData.prod : formData.dev
    const effGwId = env === 'prod' ? effectiveProdGwId : effectiveDevGwId
    const dsn = buildEnvDSN(formData.type, envData)
    if (!dsn) return toast.error("请先完整填写连接信息")
    if (!effGwId) return toast.error("请先选择网关节点")
    setTestState(prev => ({ ...prev, [env]: { status: 'testing' } }))
    try {
      const res = await apiTestDatasource(activeTenant!, dsn, effGwId)
      setTestState(prev => ({ ...prev, [env]: { status: 'ok', latencyMs: res.latency_ms } }))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '连接失败'
      setTestState(prev => ({ ...prev, [env]: { status: 'fail', error: msg } }))
    }
  }

  const handleSave = async () => {
    if (!formData.name) return toast.error("请输入数据源名称")

    const prodDSN = connChanged.prod ? buildEnvDSN(formData.type, formData.prod) : ''
    if (connChanged.prod && !prodDSN) return toast.error("请完整填写生产环境连接信息（含密码）")

    let devDSN = ''
    if (formData.isDual) {
      devDSN = connChanged.dev ? buildEnvDSN(formData.type, formData.dev) : ''
      if (connChanged.dev && !devDSN) return toast.error("请完整填写测试环境连接信息（含密码）")
    }

    if (!isEdit && testState.prod.status !== 'ok') return toast.error("请先完成生产环境连接测试")

    const envs: { env: 'dev' | 'prod'; dsn: string; gateway_id: number }[] = []
    if (formData.isDual) {
      envs.push({ env: 'dev', dsn: devDSN, gateway_id: effectiveDevGwId })
    }
    envs.push({ env: 'prod', dsn: prodDSN, gateway_id: effectiveProdGwId })

    const body = { name: formData.name, type: formData.type, is_dual: formData.isDual, envs }
    const onSuccess = () => router.push(`/${activeTenant}/data-sources`)

    if (isEdit) {
      updateMutation.mutate(body, { onSuccess })
    } else {
      createMutation.mutate(body, { onSuccess })
    }
  }

  // In single-env mode the primary card targets prod; in dual mode it targets dev.
  const primaryEnvKey: 'prod' | 'dev' = formData.isDual ? 'dev' : 'prod'

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${activeTenant}/data-sources`}>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-zinc-100">
              <ArrowLeft className="w-5 h-5 text-zinc-500" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {isEdit ? '编辑数据源' : '接入新数据源'}
            </h1>
            <p className="text-sm text-zinc-500 mt-1 font-medium">
              {isEdit ? '修改数据源配置，连接信息留空则不修改' : '配置多环境数据库连接及对应的网关节点'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-9 px-6 text-xs font-bold text-zinc-600">取消</Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!isEdit && testState.prod.status !== 'ok')}
            className={cn(
              "h-9 px-8 text-white text-xs font-bold shadow-sm",
              !isEdit && testState.prod.status !== 'ok'
                ? "bg-zinc-300 hover:bg-zinc-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700",
            )}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? (isEdit ? '保存中...' : '创建中...') : (isEdit ? '保存修改' : '创建数据源')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Basic Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card className="p-6 border-zinc-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2">
              <Badge variant="secondary" className="bg-zinc-100 text-zinc-500 border-none text-[10px] font-bold">CONFIG</Badge>
            </div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide mb-6 flex items-center">
              <Info className="w-4 h-4 mr-2 text-blue-500" />基础配置
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase flex justify-between">
                  <span>数据源名称</span>
                  <span className="text-[10px] text-zinc-300 font-bold">REQUIRED</span>
                </Label>
                <Input
                  placeholder="例如：核心业务从库"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="h-9 text-sm focus:ring-1 border-zinc-200 shadow-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase">数据库类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={v => {
                    const newType = v as DbType
                    const newPort = defaultPort(newType)
                    resetTest('dev')
                    resetTest('prod')
                    setFormData(prev => ({
                      ...prev,
                      type: newType,
                      dev:  { ...prev.dev,  port: newPort },
                      prod: { ...prev.prod, port: newPort },
                    }))
                  }}
                >
                  <SelectTrigger className="h-9 text-sm border-zinc-200 shadow-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DB_TYPES).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase">多环境支持</Label>
                  <Switch checked={formData.isDual} onCheckedChange={checked => setFormData({ ...formData, isDual: checked })} />
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  开启后可分别配置 开发(DEV) 和 生产(PROD) 两个独立节点与地址。
                </p>
              </div>
            </div>
          </Card>
          <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-lg shadow-sm">
            <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />安全与合规
            </h4>
            <p className="text-xs text-blue-600/80 leading-relaxed font-medium">
              OwlAPI 采用<strong>隧道穿透</strong>技术。您的数据库凭据在浏览器端脱敏，仅在网关节点内部加密存储。
            </p>
          </div>
        </div>

        {/* Right: Environment Configs */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Primary / DEV card */}
          <Card className="p-6 border-zinc-100 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <Globe className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 uppercase">
                  {formData.isDual ? '测试环境 (DEV)' : '配置连接'}
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                  {formData.isDual ? '用于日常开发、调试与推演测试' : '配置数据库连接信息'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <ConnFields
                type={formData.type}
                env={formData.isDual ? formData.dev : formData.prod}
                showPass={formData.isDual ? showDevPass : showProdPass}
                onTogglePass={() => formData.isDual ? setShowDevPass(v => !v) : setShowProdPass(v => !v)}
                onChange={upd => updateEnv(primaryEnvKey, upd)}
              />
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">绑定网关节点 (Gateway Node)</Label>
                <Select
                  value={String(formData.isDual ? effectiveDevGwId : effectiveProdGwId)}
                  onValueChange={v => updateEnv(primaryEnvKey, { gatewayId: Number(v) })}
                >
                  <SelectTrigger className="h-9 border-zinc-200 bg-white hover:bg-zinc-50 transition-colors">
                    <SelectValue placeholder="选择网关节点..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {gateways.map(gw => (
                      <SelectItem key={gw.id} value={String(gw.id)} className="focus:bg-zinc-50">
                        <div className="flex items-center">
                          <Server className={cn("w-3.5 h-3.5 mr-2", gw.status === 'online' ? "text-emerald-500" : "text-zinc-300")} />
                          <span className="font-bold">{gw.name}</span>
                          {gw.ip && <span className="ml-2 text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-100 rounded tracking-tight">{gw.ip}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <TestBar envKey={primaryEnvKey} state={formData.isDual ? testState.dev : testState.prod} onTest={handleTest} />
              </div>
            </div>
          </Card>

          {/* PROD card (dual-env mode only) */}
          {formData.isDual && (
            <Card className="p-6 border-zinc-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 uppercase">生产环境 (PROD)</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">面向线上正式服务的数据库配置</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <ConnFields
                  type={formData.type}
                  env={formData.prod}
                  showPass={showProdPass}
                  onTogglePass={() => setShowProdPass(v => !v)}
                  onChange={upd => updateEnv('prod', upd)}
                />
                <div className="col-span-2 space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">绑定网关节点 (Gateway Node)</Label>
                  <Select value={String(effectiveProdGwId)} onValueChange={v => updateEnv('prod', { gatewayId: Number(v) })}>
                    <SelectTrigger className="h-9 border-zinc-200 bg-blue-600/5 hover:bg-blue-600/10 transition-colors">
                      <SelectValue placeholder="选择网关节点..." />
                    </SelectTrigger>
                    <SelectContent>
                      {gateways.map(gw => (
                        <SelectItem key={gw.id} value={String(gw.id)}>
                          <div className="flex items-center">
                            <Server className={cn("w-3.5 h-3.5 mr-2", gw.status === 'online' ? "text-blue-500" : "text-zinc-300")} />
                            <span className="font-bold">{gw.name}</span>
                            {gw.ip && <span className="ml-2 text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 bg-zinc-100 rounded tracking-tight">{gw.ip}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <TestBar envKey="prod" state={testState.prod} onTest={handleTest} />
                </div>
              </div>
            </Card>
          )}

          {!formData.isDual && (
            <div className="p-10 border-2 border-dashed border-zinc-100 rounded-lg flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                <ArrowLeft className="w-6 h-6 text-zinc-300 rotate-180" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-400">单环境模式</p>
                <p className="text-[10px] text-zinc-300 max-w-[240px] mt-1 leading-relaxed">
                  如需分别配置测试和生产环境，请在左侧开启&ldquo;多环境支持&rdquo;。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Outer shell ──────────────────────────────────────────────────────────────
// Waits for existing data before mounting the form so DataSourceForm can
// initialise all state synchronously via useState lazy initialiser.

export default function NewDataSourceClientPage({ datasourceId }: { datasourceId?: number }) {
  const activeTenant = useTenant()
  const isEdit = !!datasourceId
  const { data: existingDs, isLoading } = useDataSource(activeTenant, datasourceId ?? 0)

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> 加载中...
      </div>
    )
  }

  return (
    <DataSourceForm
      key={datasourceId ?? 'new'}
      datasourceId={datasourceId}
      existingDs={isEdit ? existingDs : undefined}
    />
  )
}
