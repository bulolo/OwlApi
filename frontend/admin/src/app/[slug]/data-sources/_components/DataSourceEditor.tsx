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
  conn: EnvData
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
    return { name: '', type: 'mysql', conn: makeEnvData('mysql') }
  }
  const type = (existingDs.type ?? 'mysql') as DbType
  const parsed = parseDSN(type, existingDs.dsn || '')
  return {
    name: existingDs.name ?? '',
    type,
    conn: {
      ...parsed,
      sqlitePath: type === 'sqlite' ? (existingDs.dsn || '') : '',
      gatewayId: existingDs.gateway_id || 0,
    },
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
  const [testState, setTestState] = useState<EnvTestState>({ status: 'untested' })
  const [connChanged, setConnChanged] = useState(!isEdit)
  const [showPass, setShowPass] = useState(false)

  const resetTest = () => setTestState({ status: 'untested' })

  const updateEnv = (upd: Partial<EnvData>) => {
    const isConnField = Object.keys(upd).some(k => k !== 'gatewayId')
    if (isConnField) {
      resetTest()
      setConnChanged(true)
    }
    setFormData(prev => ({ ...prev, conn: { ...prev.conn, ...upd } }))
  }

  const firstGwId = gateways[0]?.id ?? 0
  const effectiveGwId = formData.conn.gatewayId || (!isEdit ? firstGwId : 0)

  const handleTest = async () => {
    const dsn = buildEnvDSN(formData.type, formData.conn)
    if (!dsn) return toast.error("请先完整填写连接信息")
    if (!effectiveGwId) return toast.error("请先选择网关节点")
    setTestState({ status: 'testing' })
    try {
      const testResult = await apiTestDatasource(activeTenant!, dsn, effectiveGwId)
      setTestState({ status: 'ok', latencyMs: testResult.latency_ms })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '连接失败'
      setTestState({ status: 'fail', error: msg })
    }
  }

  const handleSave = async () => {
    if (!formData.name) return toast.error("请输入数据源名称")
    const dsn = connChanged ? buildEnvDSN(formData.type, formData.conn) : ''
    if (connChanged && !dsn) return toast.error("请完整填写连接信息（含密码）")
    if (!effectiveGwId) return toast.error("请选择网关节点")
    if (!isEdit && testState.status !== 'ok') return toast.error("请先完成连接测试")

    const body = isEdit
      ? { name: formData.name, type: formData.type, dsn, gateway_id: effectiveGwId }
      : { name: formData.name, type: formData.type, dsn, gateway_id: effectiveGwId }
    const onSuccess = () => router.push(`/${activeTenant}/data-sources`)

    if (isEdit) {
      updateMutation.mutate(body, { onSuccess })
    } else {
      createMutation.mutate(body, { onSuccess })
    }
  }

  const handleTypeChange = (newType: DbType) => {
    const newPort = defaultPort(newType)
    resetTest()
    setFormData(prev => ({ ...prev, type: newType, conn: { ...prev.conn, port: newPort } }))
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
              {isEdit ? '修改数据源配置，连接信息留空则不修改' : '配置数据库连接及网关节点'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()} className="h-9 px-4 text-xs font-bold text-zinc-600">取消</Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!isEdit && testState.status !== 'ok')}
            className={cn(
              "h-9 px-4 text-white text-xs font-bold shadow-sm",
              !isEdit && testState.status !== 'ok'
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
            onNameChange={v => setFormData(prev => ({ ...prev, name: v }))}
            onTypeChange={handleTypeChange}
          />
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6">
          <EnvCard
            type={formData.type}
            env={formData.conn}
            testState={testState}
            gateways={gateways}
            effectiveGwId={effectiveGwId}
            showPass={showPass}
            onTogglePass={() => setShowPass(v => !v)}
            onChange={updateEnv}
            onTest={handleTest}
            title="配置连接"
            subtitle="数据库连接信息（环境概念已上移到项目层）"
          />
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
