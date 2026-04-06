"use client"

/**
 * useParamSync — SQL 参数提取 + 脚本参数合并 + paramDefs 自动同步
 *
 * 将 ApisClientPage 中散落的 extractedParams、preScript 解析、
 * paramDefs 自动补全等逻辑统一收拢。
 */
import { useMemo, useEffect } from "react"
import { useEndpointStore } from "../_store/useEndpointStore"
import type { ParamDef, DerivedParamDef } from "../_types"

/** 从 SQL 中提取 :paramName 形式的参数 */
export function extractSQLParams(sql: string): string[] {
  const matches = sql.match(/:([a-zA-Z_]\w*)/g)
  if (!matches) return []
  return Array.from(new Set(matches.map(m => m.slice(1))))
}

/** 从脚本代码中提取 params.xxx / params["xxx"] 形式的参数 */
function extractScriptParams(code: string): string[] {
  const dotAccess = code.match(/params\.([a-zA-Z_]\w*)/g)?.map(m => m.slice(7)) || []
  const bracketAccess = code.match(/params\["([a-zA-Z_]\w*)"\]/g)?.map(m => m.replace(/params\["|"\]/g, "")) || []
  const bracketAccessSingle = code.match(/params\['([a-zA-Z_]\w*)'\]/g)?.map(m => m.replace(/params\['|'\]/g, "")) || []
  const all = Array.from(new Set([...dotAccess, ...bracketAccess, ...bracketAccessSingle]))
  return all.filter(p => !["limit", "offset"].includes(p) && !p.startsWith("_"))
}

/**
 * 使用此 hook 来获取：
 * - extractedParams: 从 SQL 自动提取的参数名
 * - derivedParamDefs: 合并了 SQL 提取 + 手动定义 + 脚本参数的完整列表
 * - 自动同步 store 中的 paramDefs
 */
export function useParamSync() {
  const form = useEndpointStore(s => s.form)
  const scripts = useEndpointStore(s => s.scripts)
  const isNew = useEndpointStore(s => s.isNew)
  const setParamDefs = useEndpointStore(s => s.setParamDefs)

  // 从 SQL 提取
  const extractedParams = useMemo(() => extractSQLParams(form.sql), [form.sql])

  // 脚本参数自动补全
  useEffect(() => {
    const preScript = scripts.find(s => s.id === form.preScriptId)
    if (preScript?.code) {
      const userParams = extractScriptParams(preScript.code)
      if (userParams.length > 0) {
        setParamDefs(prev => {
          const existing = new Set(prev.map(d => d.name))
          const added: ParamDef[] = userParams
            .filter(p => !existing.has(p))
            .map(p => ({ name: p, type: "string" as const, required: false, desc: "" }))
          return added.length > 0 ? [...prev, ...added] : prev
        })
        return
      }
    }
    // 新建接口 + SQL 有参数 + 当前无定义 → 自动初始化
    if (isNew && extractedParams.length > 0 && form.paramDefs.length === 0) {
      setParamDefs(extractedParams.map(p => ({ name: p, type: "string", required: false, desc: "" })))
    }
  }, [form.preScriptId, scripts, extractedParams, isNew, form.paramDefs.length, setParamDefs])

  // 合并视图 (SQL 提取 + 手动定义 + 脚本)
  const derivedParamDefs = useMemo((): DerivedParamDef[] => {
    const list: DerivedParamDef[] = (form.paramDefs || []).map(d => ({
      ...d,
      _isAuto: extractedParams.includes(d.name),
      _source: extractedParams.includes(d.name) ? "sql" as const : "manual" as const,
    }))

    const existing = new Set(list.map(d => d.name))
    extractedParams.forEach(p => {
      if (!existing.has(p)) {
        list.push({
          name: p,
          type: "string",
          required: false,
          desc: "",
          default: "",
          _isAuto: true,
          _source: "sql",
        })
      }
    })

    return list
  }, [form.paramDefs, extractedParams])

  return { extractedParams, derivedParamDefs }
}
