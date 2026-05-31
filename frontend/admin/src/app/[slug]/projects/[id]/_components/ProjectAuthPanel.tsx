"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTenant } from "@/providers/TenantProvider"
import { useGetProjectAuth, updateProjectAuth, createProjectAuthKey, deleteProjectAuthKey, getGetProjectAuthQueryKey, getGetProjectQueryKey } from "@/lib/sdk"

type AuthType = "public" | "api_key" | "jwt"
type ProjectAuthKey = { id: string; type: string; name: string; value: string; expires_at?: string | null }
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Globe, Key, Shield, Plus, Trash2, Copy, Check, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { showConfirm } from "@/store/useConfirmStore"
import { format, parseISO, isAfter } from "date-fns"

const AUTH_TYPES: { value: AuthType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: "public",
    label: "公开访问",
    desc: "无需鉴权，任何人可调用",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    value: "api_key",
    label: "API Key",
    desc: "调用时携带有效的 API Key",
    icon: <Key className="w-4 h-4" />,
  },
  {
    value: "jwt",
    label: "JWT",
    desc: "调用时携带有效的 JWT Token",
    icon: <Shield className="w-4 h-4" />,
  },
]

// ── Shared helpers ────────────────────────────────────────────────────────────

function isExpiredDate(expiresAt?: string | null): boolean {
  return !!expiresAt && !isAfter(parseISO(expiresAt), new Date())
}

function CopyButton({ text, id }: { text: string; id: string }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }
  return (
    <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" title="复制">
      {copiedId === id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

// ── Key row ───────────────────────────────────────────────────────────────────

interface KeyRowProps {
  name: string
  keyValue: string
  expiresAt?: string | null
  onDelete: () => void
  deleteDisabled?: boolean
}

function KeyRow({ name, keyValue, expiresAt, onDelete, deleteDisabled }: KeyRowProps) {
  const expired = isExpiredDate(expiresAt)
  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-lg border bg-zinc-50/40",
      expired ? "border-red-200 bg-red-50/30" : "border-border-subtle",
    )}>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-foreground truncate">{name}</p>
          {expired && <span className="text-2xs font-bold text-red-500 shrink-0">已过期</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <code className="text-2xs font-mono text-muted-foreground truncate max-w-[220px]">
            {keyValue.slice(0, 10)}••••{keyValue.slice(-4)}
          </code>
          <CopyButton text={keyValue} id={keyValue} />
        </div>
        {expiresAt && (
          <p className={cn("text-2xs", expired ? "text-red-500" : "text-muted-foreground")}>
            过期：{format(parseISO(expiresAt), "yyyy-MM-dd HH:mm")}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0 mt-0.5"
        onClick={onDelete}
        disabled={deleteDisabled}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

// ── Create form ───────────────────────────────────────────────────────────────

interface CreateKeyFormProps {
  onCreate: (name: string, expiresAt?: string) => void
  isPending: boolean
  placeholder: string
}

function CreateKeyForm({ onCreate, isPending, placeholder }: CreateKeyFormProps) {
  const [name, setName] = useState("")
  const [expiry, setExpiry] = useState("")
  const [showExpiry, setShowExpiry] = useState(false)

  function handleCreate() {
    if (!name.trim()) return
    onCreate(name.trim(), expiry ? new Date(expiry).toISOString() : undefined)
    setName("")
    setExpiry("")
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          className="h-8 text-xs border-border rounded-lg flex-1"
          placeholder={placeholder}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !showExpiry && handleCreate()}
        />
        <button
          onClick={() => setShowExpiry(v => !v)}
          className={cn(
            "h-8 px-2 rounded-lg border text-2xs font-medium transition-colors shrink-0",
            showExpiry ? "border-primary/40 text-primary bg-primary/5" : "border-border text-muted-foreground hover:border-border hover:bg-zinc-50",
          )}
          title="设置过期时间"
        >
          <CalendarClock className="w-3.5 h-3.5" />
        </button>
        <Button
          className="h-8 px-3 text-xs font-bold shrink-0"
          onClick={handleCreate}
          disabled={!name.trim() || isPending}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> 创建
        </Button>
      </div>
      {showExpiry && (
        <div className="flex items-center gap-2">
          <CalendarClock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Input
            type="datetime-local"
            className="h-8 text-xs border-border rounded-lg flex-1"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
          <span className="text-2xs text-muted-foreground shrink-0 whitespace-nowrap">不填则永不过期</span>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProjectAuthPanel({ projectId }: { projectId: number }) {
  const slug = useTenant()
  const qc = useQueryClient()
  const queryKey = getGetProjectAuthQueryKey(slug, projectId)

  const { data: auth, isLoading } = useGetProjectAuth(slug, projectId, {
    query: { enabled: !!slug && !!projectId },
  }) as { data: { auth_type: AuthType; keys: ProjectAuthKey[] } | undefined; isLoading: boolean }

  const updateMutation = useMutation({
    mutationFn: (authType: AuthType) => updateProjectAuth(slug, projectId, { auth_type: authType }) as Promise<{ auth_type: AuthType; keys: ProjectAuthKey[] }>,
    onSuccess: (data) => {
      qc.setQueryData(queryKey, data)
      qc.invalidateQueries({ queryKey: getGetProjectQueryKey(slug, projectId) })
      toast.success("鉴权方式已切换")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createKeyMutation = useMutation({
    mutationFn: ({ name, expiresAt }: { name: string; expiresAt?: string }) =>
      createProjectAuthKey(slug, projectId, { type: authType === "public" ? "api_key" : authType, name, expires_at: expiresAt }),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("密钥已创建") },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteKeyMutation = useMutation({
    mutationFn: (keyId: string) => deleteProjectAuthKey(slug, projectId, keyId),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success("密钥已删除") },
    onError: (e: Error) => toast.error(e.message),
  })

  const authType = auth?.auth_type ?? "public"
  const keys: ProjectAuthKey[] = auth?.keys ?? []
  // Filter keys by current auth type for display
  const filteredKeys = keys.filter(k => k.type === authType)

  async function handleTypeChange(type: AuthType) {
    if (type === authType) return
    updateMutation.mutate(type)
  }

  async function handleDeleteKey(key: ProjectAuthKey) {
    const label = key.type === "jwt" ? `JWT 密钥「${key.name}」？删除后以该密钥签发的 Token 将立即失效。` : `API Key「${key.name}」？`
    if (!await showConfirm(`确定删除${label}`)) return
    deleteKeyMutation.mutate(key.id)
  }

  if (isLoading) {
    return <div className="p-6 text-xs text-muted-foreground">加载中...</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Auth type selector */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">鉴权方式</p>
        <div className="grid grid-cols-3 gap-2">
          {AUTH_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => handleTypeChange(t.value)}
              disabled={updateMutation.isPending}
              className={cn(
                "relative flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-all",
                authType === t.value
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border-subtle hover:border-border hover:bg-zinc-50/60",
              )}
            >
              <div className={cn(
                "p-1.5 rounded-md",
                authType === t.value ? "bg-primary/10 text-primary" : "bg-zinc-100 text-muted-foreground",
              )}>
                {t.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{t.label}</p>
                <p className="text-2xs text-muted-foreground leading-snug mt-0.5">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Key list — shown for api_key and jwt */}
      {authType !== "public" && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {authType === "api_key" ? "API Keys" : "JWT 签名密钥"}
            <span className="ml-2 font-normal normal-case text-zinc-400">{filteredKeys.length} 个</span>
          </p>
          {filteredKeys.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              {authType === "api_key" ? "尚未创建任何 API Key" : "尚未创建任何 JWT 密钥"}
            </p>
          )}
          <div className="space-y-2">
            {filteredKeys.map(k => (
              <KeyRow
                key={k.id}
                name={k.name}
                keyValue={k.value}
                expiresAt={k.expires_at}
                onDelete={() => handleDeleteKey(k)}
                deleteDisabled={deleteKeyMutation.isPending}
              />
            ))}
          </div>
          <CreateKeyForm
            placeholder={authType === "api_key" ? "Key 名称（如：mobile-app）" : "密钥名称（如：web-client）"}
            isPending={createKeyMutation.isPending}
            onCreate={(name, expiresAt) => createKeyMutation.mutate({ name, expiresAt })}
          />
          <p className="text-2xs text-muted-foreground leading-relaxed">
            {authType === "api_key"
              ? <>调用时在请求 Body 或 Header 中携带 <code className="font-mono bg-zinc-100 px-1 rounded">Authorization: &lt;key&gt;</code></>
              : <>用对应密钥以 HS256 签发 JWT，请求时携带{" "}<code className="font-mono bg-zinc-100 px-1 rounded">Authorization: Bearer &lt;token&gt;</code>。多个密钥中任意一个有效即通过验证。</>
            }
          </p>
        </div>
      )}
    </div>
  )
}
