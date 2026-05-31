// 常见环境预设——限定环境名，确保语义一致（prod 即生产、dev 即开发……）。
// 创建项目时选初始环境、环境管理里新增环境都复用这里。
export const ENV_PRESETS: { value: string; label: string }[] = [
  { value: "prod", label: "prod · 生产" },
  { value: "staging", label: "staging · 预发布" },
  { value: "test", label: "test · 测试" },
  { value: "dev", label: "dev · 开发" },
  { value: "uat", label: "uat · 验收" },
]
