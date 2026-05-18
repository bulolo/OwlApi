// 环境圆点配色:
//   prod    → 绿 (生产稳定运行)
//   staging → 蓝 (预发布)
//   dev     → 黄 (开发)
//   其他    → 灰
//
// Tailwind JIT 不会扫描运行时拼接的类名串, 所以这里所有 class 都写全字符串.

interface EnvColorClasses {
  /** Lucide <Circle> 用：text + fill 同色 */
  dot: string
  /** 纯背景圆点（非 svg）用 */
  bg: string
}

const PRESETS: Record<string, EnvColorClasses> = {
  prod:    { dot: 'text-emerald-500 fill-emerald-500', bg: 'bg-emerald-500' },
  staging: { dot: 'text-blue-500 fill-blue-500',       bg: 'bg-blue-500'    },
  stage:   { dot: 'text-blue-500 fill-blue-500',       bg: 'bg-blue-500'    },
  dev:     { dot: 'text-amber-500 fill-amber-500',     bg: 'bg-amber-500'   },
}

const FALLBACK: EnvColorClasses = {
  dot: 'text-zinc-400 fill-zinc-400',
  bg:  'bg-zinc-400',
}

export function envColor(name: string): EnvColorClasses {
  return PRESETS[name] ?? FALLBACK
}
