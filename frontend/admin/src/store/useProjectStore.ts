import { create } from 'zustand'

export type ApiParameter = {
  name: string
  type: 'string' | 'number' | 'boolean'
  required: boolean
  defaultValue?: string
  description?: string
}

export type ApiEndpoint = {
  id: string
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  sql: string
  description?: string
  parameters?: ApiParameter[]
}

export type EnvConfig = {
  host: string
  port: number
  gatewayId: string
  status: 'Connected' | 'Error' | 'Pending'
}

export type DataSource = {
  id: string
  name: string
  type: 'MySQL' | 'PostgreSQL' | 'StarRocks' | 'MongoDB' | 'Oracle'
  isDual: boolean
  dev: EnvConfig
  prod?: EnvConfig
  updatedAt: string
}

export type Gateway = {
  id: string
  name: string
  address: string
  version: string
  status: 'Online' | 'Offline'
  load: number
}

export type User = {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Developer' | 'Viewer'
  assignedProjects: string[] // Array of project IDs
}

export type Project = {
  id: string
  name: string
  description: string
  apis: ApiEndpoint[]
  dataSourceId?: string
}

export type MockRow = Record<string, any>

export type MockTable = {
  name: string
  columns: string[]
  data: MockRow[]
}

interface ProjectState {
  projects: Project[]
  mockTables: MockTable[]
  dataSources: DataSource[]
  gateways: Gateway[]
  users: User[]

  // Actions
  addProject: (project: Omit<Project, 'id' | 'apis'>) => void
  addApi: (projectId: string, api: Omit<ApiEndpoint, 'id'>) => void
  updateApi: (projectId: string, apiId: string, updates: Partial<ApiEndpoint>) => void
  deleteApi: (projectId: string, apiId: string) => void

  // Data Source / Gateway Actions
  addDataSource: (ds: Omit<DataSource, 'id' | 'updatedAt' | 'status'>) => void
  addGateway: (gw: Omit<Gateway, 'id' | 'status' | 'load'>) => void

  // User Management
  assignProject: (userId: string, projectId: string) => void

  // Mock executions
  executeSql: (sql: string) => Promise<any>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [
    {
      id: '1',
      name: '电商演示项目',
      description: '标准电商网站的 API 接口集',
      apis: [
        { id: '101', path: '/products', method: 'GET', sql: 'SELECT * FROM products', description: '获取产品列表' },
        { id: '102', path: '/orders', method: 'POST', sql: 'INSERT INTO orders (user_id, total) VALUES (?, ?)', description: '创建订单' },
        {
          id: '103',
          path: '/area/search',
          method: 'POST',
          sql: 'SELECT * FROM area WHERE name = :name',
          description: '区域查询 (参数示例)',
          parameters: [
            { name: 'name', type: 'string', required: true, defaultValue: '朝阳区', description: '区域名称' }
          ]
        }
      ]
    },
    {
      id: '2',
      name: '用户管理系统',
      description: '管理平台用户的内部工具',
      apis: []
    }
  ],
  mockTables: [
    {
      name: 'users',
      columns: ['id', 'name', 'email', 'role'],
      data: [
        { id: 1, name: '张三', email: 'zhangsan@example.com', role: '管理员' },
        { id: 2, name: '李四', email: 'lisi@example.com', role: '普通用户' },
      ]
    },
    {
      name: 'products',
      columns: ['id', 'name', 'price', 'stock'],
      data: [
        { id: 1, name: '笔记本电脑', price: 999.99, stock: 50 },
        { id: 2, name: '无线鼠标', price: 29.99, stock: 200 },
      ]
    },
    {
      name: 'area',
      columns: ['id', 'name', 'code', 'parent_id'],
      data: [
        { id: 1, name: '北京市', code: '110000', parent_id: 0 },
        { id: 2, name: '朝阳区', code: '110105', parent_id: 1 },
        { id: 3, name: '海淀区', code: '110108', parent_id: 1 },
      ]
    }
  ],
  dataSources: [
    {
      id: 'ds1',
      name: '核心业务主库',
      type: 'MySQL',
      isDual: true,
      dev: { host: 'dev-mysql.internal', port: 3306, gatewayId: 'gw1', status: 'Connected' },
      prod: { host: 'prod-mysql.db.lan', port: 3306, gatewayId: 'gw2', status: 'Connected' },
      updatedAt: '2小时前'
    },
    {
      id: 'ds2',
      name: '报表分析集群',
      type: 'StarRocks',
      isDual: true,
      dev: { host: '192.168.1.100', port: 9030, gatewayId: 'gw1', status: 'Connected' },
      prod: { host: '10.0.5.20', port: 9030, gatewayId: 'gw2', status: 'Connected' },
      updatedAt: '刚刚'
    },
    {
      id: 'ds3',
      name: '用户画像仓库',
      type: 'PostgreSQL',
      isDual: true,
      dev: { host: 'localhost', port: 5432, gatewayId: 'gw1', status: 'Connected' },
      prod: { host: 'pg-prod.vpc.internal', port: 5432, gatewayId: 'gw2', status: 'Connected' },
      updatedAt: '1天前'
    },
    {
      id: 'ds4',
      name: '公共基础字典',
      type: 'StarRocks',
      isDual: false,
      dev: { host: 'starrocks-common.lan', port: 9030, gatewayId: 'gw1', status: 'Connected' },
      updatedAt: '刚刚'
    },
  ],
  gateways: [
    { id: 'gw1', name: '南山智园-node1', address: '121.40.5.11', version: 'v2.4.0', status: 'Online', load: 32 },
    { id: 'gw2', name: '腾讯云-node2', address: '121.40.5.12', version: 'v2.4.0', status: 'Online', load: 15 },
    { id: 'gw3', name: '海外中转节点', address: '139.224.1.20', version: 'v2.3.1', status: 'Offline', load: 0 },
  ],
  users: [
    { id: 'u1', name: '张三', email: 'zhangsan@example.com', role: 'Admin', assignedProjects: ['1', '2'] },
    { id: 'u2', name: '李四', email: 'lisi@example.com', role: 'Developer', assignedProjects: ['1'] },
    { id: 'u3', name: '王五', email: 'wangwu@example.com', role: 'Viewer', assignedProjects: [] },
  ],

  addProject: (project) => set((state) => ({
    projects: [...state.projects, { ...project, id: Math.random().toString(36).substr(2, 9), apis: [] }]
  })),

  addApi: (projectId, api) => set((state) => ({
    projects: state.projects.map(p =>
      p.id === projectId
        ? { ...p, apis: [...p.apis, { ...api, id: Math.random().toString(36).substr(2, 9) }] }
        : p
    )
  })),

  updateApi: (projectId, apiId, updates) => set((state) => ({
    projects: state.projects.map(p =>
      p.id === projectId
        ? { ...p, apis: p.apis.map(a => a.id === apiId ? { ...a, ...updates } : a) }
        : p
    )
  })),

  deleteApi: (projectId, apiId) => set((state) => ({
    projects: state.projects.map(p =>
      p.id === projectId
        ? { ...p, apis: p.apis.filter(a => a.id !== apiId) }
        : p
    )
  })),

  addDataSource: (ds) => set((state) => ({
    dataSources: [
      ...state.dataSources,
      {
        ...ds,
        id: Math.random().toString(36).substr(2, 9),
        updatedAt: '刚刚'
      }
    ]
  })),

  addGateway: (gw) => set((state) => ({
    gateways: [...state.gateways, { ...gw, id: Math.random().toString(36).substr(2, 9), status: 'Online', load: 0 }]
  })),

  assignProject: (userId, projectId) => set((state) => ({
    users: state.users.map(u =>
      u.id === userId
        ? { ...u, assignedProjects: u.assignedProjects.includes(projectId) ? u.assignedProjects.filter(id => id !== projectId) : [...u.assignedProjects, projectId] }
        : u
    )
  })),

  executeSql: async (sql) => {
    // Mock SQL execution parser
    // Very basic 'mock' parser
    return new Promise((resolve) => {
      setTimeout(() => {
        const state = get()
        // Normalize whitespace: remove newlines and extra spaces, convert to lowercase
        const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase()

        if (normalizedSql.includes('select * from products')) return resolve(state.mockTables.find(t => t.name === 'products')?.data)
        if (normalizedSql.includes('select * from users')) return resolve(state.mockTables.find(t => t.name === 'users')?.data)

        if (normalizedSql.includes('select * from area')) {
          const allAreas = state.mockTables.find(t => t.name === 'area')?.data || []
          // Simple mock filter
          if (normalizedSql.includes('where name =')) {
            // Flexible regex to catch name = 'X' regardless of spacing
            const match = normalizedSql.match(/name\s*=\s*'([^']+)'/)
            if (match && match[1]) {
              return resolve(allAreas.filter(a => a.name.includes(match[1])))
            }
          }
          return resolve(allAreas)
        }

        resolve({ message: '查询执行成功 (模拟器)', rowsAffected: 1 })
      }, 600)
    })
  }
}))
