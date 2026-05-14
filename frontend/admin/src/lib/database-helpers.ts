// ─── DSN / Connection Helpers ─────────────────────────────────────────────────

/**
 * Parse a stored DSN into host + db strings for display purposes.
 * Used on the data-sources list card.
 */
export function parseDsnPreview(type: string, dsn: string): { host: string; db: string } {
  if (!dsn) return { host: '-', db: '-' }
  try {
    if (type === 'mysql' || type === 'starrocks' || type === 'doris') {
      const m = dsn.match(/@(?:tcp|udp)?\(([^)]+)\)\/([^?]*)/)
      if (m) return { host: m[1], db: m[2] || '-' }
    }
    if (type === 'postgres') {
      const url = new URL(dsn)
      return { host: `${url.hostname}:${url.port || '5432'}`, db: url.pathname.slice(1) }
    }
    if (type === 'sqlserver') {
      const url = new URL(dsn)
      return { host: `${url.hostname}:${url.port || '1433'}`, db: url.searchParams.get('database') || '-' }
    }
    if (type === 'sqlite') return { host: 'local', db: dsn }
  } catch { /* ignore */ }
  return { host: '-', db: '-' }
}

// ─── DSN Build / Parse (used in data-sources/new/page) ───────────────────────

export function defaultPort(type: string): string {
  if (type === 'postgres') return '5432'
  if (type === 'sqlserver') return '1433'
  if (type === 'starrocks' || type === 'doris') return '9030'
  return '3306'
}

export type ConnParams = { host: string; port: string; user: string; password: string; database: string }

export function defaultConn(type: string): ConnParams {
  return { host: '', port: defaultPort(type), user: '', password: '', database: '' }
}

/**
 * Build a DSN string from connection parameters.
 */
export function buildDSN(type: string, p: ConnParams): string {
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

/**
 * Parse a DSN string back into connection parameters.
 * Handles "****" masked password from server — clears it to empty.
 */
export function parseDSN(type: string, dsn: string): ConnParams {
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

// ─── Relative Time ────────────────────────────────────────────────────────────

/**
 * Format an ISO timestamp as a human-readable relative string (e.g. "5 分钟前").
 * Falls back to toLocaleDateString() for timestamps older than 24 hours.
 */
export function formatRelativeTime(ts: string): string {
  if (!ts) return "-"
  const d = new Date(ts)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return `${diff} 秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return d.toLocaleDateString()
}
