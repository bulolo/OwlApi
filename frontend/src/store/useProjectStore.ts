import { create } from 'zustand'

export type ApiEndpoint = {
  id: string
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  sql: string
  description?: string
}

export type DataSource = {
  id: string
  name: string
  type: 'MySQL' | 'PostgreSQL' | 'MongoDB' | 'Redis' | 'Oracle'
  host: string
  port: number
  gatewayId?: string // Link to the gateway bridging this connection
  status: 'Connected' | 'Error' | 'Pending'
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
        { id: '102', path: '/orders', method: 'POST', sql: 'INSERT INTO orders (user_id, total) VALUES (?, ?)', description: '创建订单' }
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
    }
  ],
  dataSources: [
    { id: 'ds1', name: '生产库-主库', type: 'MySQL', host: 'localhost', port: 3306, gatewayId: 'gw1', status: 'Connected', updatedAt: '2小时前' },
    { id: 'ds2', name: '数据仓库-分析', type: 'PostgreSQL', host: '192.168.1.50', gatewayId: 'gw2', port: 5432, status: 'Connected', updatedAt: '1天前' },
    { id: 'ds3', name: '本地缓存', type: 'Redis', host: '127.0.0.1', gatewayId: 'gw1', port: 6379, status: 'Error', updatedAt: '刚刚' },
  ],
  gateways: [
    { id: 'gw1', name: '北京集群-Node1', address: '121.40.5.11', version: 'v2.4.0', status: 'Online', load: 32 },
    { id: 'gw2', name: '北京集群-Node2', address: '121.40.5.12', version: 'v2.4.0', status: 'Online', load: 15 },
    { id: 'gw3', name: '上海容灾节点', address: '139.224.1.20', version: 'v2.3.1', status: 'Offline', load: 0 },
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
    dataSources: [...state.dataSources, { ...ds, id: Math.random().toString(36).substr(2, 9), status: 'Connected', updatedAt: '刚刚' }]
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
        const lowerSql = sql.toLowerCase()

        if (lowerSql.includes('select * from products')) return resolve(state.mockTables.find(t => t.name === 'products')?.data)
        if (lowerSql.includes('select * from users')) return resolve(state.mockTables.find(t => t.name === 'users')?.data)

        resolve({ message: '查询执行成功 (模拟器)', rowsAffected: 1 })
      }, 600)
    })
  }
}))
