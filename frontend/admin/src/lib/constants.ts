export const STORAGE_KEYS = {
  TOKEN: 'owlapi_token',
  USER: 'owlapi_user',
  REMEMBER_EMAIL: 'owlapi_remember_email',
} as const

export const PARAM_PLACEHOLDER_PREFIX = '__OWLPARAM'
export const PARAM_PLACEHOLDER_REGEX = /__OWLPARAM(\d+)__/g

export const DB_TYPES: Record<string, { label: string; color: string }> = {
  mysql:     { label: 'MySQL',      color: 'text-blue-600 border-blue-100 bg-blue-50/30' },
  postgres:  { label: 'PostgreSQL', color: 'text-indigo-600 border-indigo-100 bg-indigo-50/30' },
  sqlserver: { label: 'SQL Server', color: 'text-red-600 border-red-100 bg-red-50/30' },
  starrocks: { label: 'StarRocks',  color: 'text-amber-600 border-amber-100 bg-amber-50/30' },
  doris:     { label: 'Doris',      color: 'text-emerald-600 border-emerald-100 bg-emerald-50/30' },
  sqlite:    { label: 'SQLite',     color: 'text-zinc-600 border-zinc-100 bg-zinc-50/30' },
}
