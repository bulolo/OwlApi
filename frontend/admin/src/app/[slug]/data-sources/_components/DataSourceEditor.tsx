"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTenant } from "@/providers/TenantProvider"
import { useGateways, useDataSource, useCreateDataSource, useUpdateDataSource } from "@/hooks"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { apiTestDatasource } from "@/lib/api-client"
import type { DataSource } from "@/lib/api-client"
import { DB_TYPES } from "@/lib/constants"
import { buildDSN, parseDSN, defaultPort, defaultConn } from "@/lib/database-helpers"
import { DataSourceForm } from "../new/_components/DataSourceForm"
import { EnvCard } from "../new/_components/EnvConfig"
import type { EnvData, EnvTestState } from "../new/_components/EnvConfig"

type DbType = keyof typeof DB_TYPES

type FormData = {
  name: string
  type: DbType
  isDual: boolean
  dev: EnvData
  prod: EnvData
}

function buildEnvDSN(type: string, env: EnvData): string {
  if (type === 'sqlite') return env.sqlitePath
  if (!env.host || !env.user || !env.database) return ''
  return buildDSN(type, env)
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

function DataSourceEditorForm({
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

  const [formData, setFormData] = useState<FormData>(() => deriveFormData(existingDs))
  const [testState, setTestState] = useState<{ prod: EnvTestState; dev: EnvTestState }>({
    prod: { status: 'untested' },
    dev:  { status: 'untested' },
  })
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
      const testResult = await apiTestDatasource(activeTenant!, dsn, effGwId)
      setTestState(prev => ({ ...prev, [env]: { status: 'ok', latencyMs: testResult.latency_ms } }))
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

  const primaryEnvKey: 'prod' | 'dev' = formData.isDual ? 'dev' : 'prod'

  const handleTypeChange = (newType: DbType) => {
    const newPort = defaultPort(newType)
    resetTest('dev')
    resetTest('prod')
    setFormData(prev => ({
      ...prev,
      type: newType,
      dev:  { ...prev.dev,  port: newPort },
      prod: { ...prev.prod, port: newPort },
    }))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${activeTenant}/data-sources`}>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-zinc-100">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {isEdit ? '编辑数据源' : '接入新数据源'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              {isEdit ? '修改数据源配置，连接信息留空则不修改' : '配置多环境数据库连接及对应的网关节点'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-9 px-4 text-xs font-bold text-zinc-600">取消</Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!isEdit && testState.prod.status !== 'ok')}
            className={cn(
              "h-9 px-4 text-white text-xs font-bold shadow-sm",
              !isEdit && testState.prod.status !== 'ok'
                ? "bg-zinc-300 hover:bg-zinc-300 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90",
            )}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? (isEdit ? '保存中...' : '创建中...') : (isEdit ? '保存修改' : '创建数据源')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <DataSourceForm
            name={formData.name}
            type={formData.type}
            isDual={formData.isDual}
            onNameChange={v => setFormData(prev => ({ ...prev, name: v }))}
            onTypeChange={handleTypeChange}
            onIsDualChange={v => setFormData(prev => ({ ...prev, isDual: v }))}
          />
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6">
          <EnvCard
            envKey={primaryEnvKey}
            type={formData.type}
            env={formData.isDual ? formData.dev : formData.prod}
            testState={formData.isDual ? testState.dev : testState.prod}
            gateways={gateways}
            effectiveGwId={formData.isDual ? effectiveDevGwId : effectiveProdGwId}
            showPass={formData.isDual ? showDevPass : showProdPass}
            onTogglePass={() => formData.isDual ? setShowDevPass(v => !v) : setShowProdPass(v => !v)}
            onChange={upd => updateEnv(primaryEnvKey, upd)}
            onTest={handleTest}
            accent="emerald"
            title={formData.isDual ? '测试环境 (DEV)' : '配置连接'}
            subtitle={formData.isDual ? '用于日常开发、调试与推演测试' : '配置数据库连接信息'}
          />

          {formData.isDual && (
            <EnvCard
              envKey="prod"
              type={formData.type}
              env={formData.prod}
              testState={testState.prod}
              gateways={gateways}
              effectiveGwId={effectiveProdGwId}
              showPass={showProdPass}
              onTogglePass={() => setShowProdPass(v => !v)}
              onChange={upd => updateEnv('prod', upd)}
              onTest={handleTest}
              accent="blue"
              title="生产环境 (PROD)"
              subtitle="面向线上正式服务的数据库配置"
            />
          )}

          {!formData.isDual && (
            <div className="p-10 border-2 border-dashed border-border-subtle rounded-lg flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                <ArrowLeft className="w-6 h-6 text-zinc-300 rotate-180" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground">单环境模式</p>
                <p className="text-2xs text-zinc-300 max-w-[240px] mt-1 leading-relaxed">
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

export default function DataSourceEditor({ datasourceId }: { datasourceId?: number }) {
  const activeTenant = useTenant()
  const isEdit = !!datasourceId
  const { data: existingDs, isLoading } = useDataSource(activeTenant, datasourceId ?? 0)

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> 加载中...
      </div>
    )
  }

  return (
    <DataSourceEditorForm
      key={datasourceId ?? 'new'}
      datasourceId={datasourceId}
      existingDs={isEdit ? existingDs : undefined}
    />
  )
}
