# 环境变量

## Gateway Runner

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `OWLAPI_TENANT_ID` | 归属租户 | `default` |
| `OWLAPI_RUNNER_ID` | 节点 ID | (必填) |
| `OWLAPI_RUNNER_TOKEN` | 鉴权令牌 | (必填) |
| `OWLAPI_SERVER_URL` | 控制面地址 | `localhost:9090` |

## Control Plane

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL 连接串 | (必填) |
| `OWLAPI_HTTP_PORT` | HTTP 监听端口 | `:3000` |
| `JWT_SECRET` | JWT 签名密钥 | (生产环境必填) |
| `TZ` | 时区 | `Asia/Shanghai` |
