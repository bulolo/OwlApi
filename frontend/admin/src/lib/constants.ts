export const STORAGE_KEYS = {
  TOKEN: 'owlapi_token',
  USER: 'owlapi_user',
  REMEMBER_EMAIL: 'owlapi_remember_email',
} as const

export const PARAM_PLACEHOLDER_PREFIX = '__OWLPARAM'
export const PARAM_PLACEHOLDER_REGEX = /__OWLPARAM(\d+)__/g

export const DB_TYPES = {
  mysql:     { label: 'MySQL',      color: 'text-blue-600 border-blue-100 bg-blue-50/30',     iconBg: '#f0f9ff' },
  postgres:  { label: 'PostgreSQL', color: 'text-indigo-600 border-indigo-100 bg-indigo-50/30', iconBg: '#eef2ff' },
  sqlserver: { label: 'SQL Server', color: 'text-red-600 border-red-100 bg-red-50/30',        iconBg: '#fff1f0' },
  starrocks: { label: 'StarRocks',  color: 'text-amber-600 border-amber-100 bg-amber-50/30',  iconBg: '#fffbeb' },
  doris:     { label: 'Doris',      color: 'text-emerald-600 border-emerald-100 bg-emerald-50/30', iconBg: '#f0fdf4' },
  sqlite:    { label: 'SQLite',     color: 'text-zinc-600 border-zinc-100 bg-zinc-50/30',     iconBg: '#f8fafc' },
}
