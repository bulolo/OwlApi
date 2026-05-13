# 独立 Gateway 部署

将 Gateway 部署到内网环境后，即可通过 gRPC 反向隧道安全访问内网数据库，无需开放任何数据库端口。

## 部署架构

```
OwlApi Cloud（公网）                    内网环境
┌──────────────────┐                ┌──────────────────┐
│  Control Plane   │◄──gRPC 长连接──│    Gateway        │
│  api.owlapi.cn   │   （Gateway    │  (内网任意机器)    │
│  :9090           │    主动发起）   │                  │
└──────────────────┘                └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │  内网数据库        │
                                    │  MySQL / MSSQL    │
                                    │  PostgreSQL 等    │
                                    └──────────────────┘
```

Gateway 主动连接控制面，**无需公网 IP**，也**无需开放数据库防火墙端口**。

---

## 前置准备

### 在控制台创建 Gateway 节点

1. 登录 [admin.owlapi.cn](https://admin.owlapi.cn)（或你的私有部署地址）
2. 进入「网关管理」→「创建网关」
3. 输入节点名称（如 `IDC-Primary`），确认创建
4. 保存返回的 **Gateway ID** 和 **Gateway Token**

::: warning
Token 仅在创建时完整显示，页面关闭后不再展示，请务必妥善保存。
:::

---

## 使用 Docker Compose 部署

### 方式一：使用官方配置文件（推荐）

```bash
# 下载官方 Gateway compose 配置
curl -O https://raw.githubusercontent.com/bulolo/owlapi/main/deploy/docker-compose.gateway.yml

# 编辑配置
vim docker-compose.gateway.yml
```

填写以下变量：

```yaml
environment:
  OWLAPI_SERVER_URL: "dns:///api.owlapi.cn:9090"   # 控制面 gRPC 地址
  OWLAPI_GATEWAY_ID: "1"                            # 控制台创建时获取
  OWLAPI_GATEWAY_TOKEN: "gw_your-token"             # 控制台创建时获取
  OWLAPI_TENANT_ID: "1"                             # 归属租户 ID
```

启动：

```bash
docker compose -f docker-compose.gateway.yml up -d
```

### 方式二：直接编写 Compose 文件

```yaml
services:
  gateway:
    image: registry.cn-hangzhou.aliyuncs.com/owlapi/gateway:latest
    container_name: owlapi_gateway
    restart: unless-stopped
    environment:
      - OWLAPI_SERVER_URL=dns:///api.owlapi.cn:9090
      - OWLAPI_GATEWAY_ID=1
      - OWLAPI_GATEWAY_TOKEN=gw_your-token
      - OWLAPI_TENANT_ID=1
      - TZ=Asia/Shanghai
    volumes:
      - gateway_data:/data

volumes:
  gateway_data:
```

---

## 环境变量说明

| 变量名 | 说明 | 是否必填 |
| :--- | :--- | :--- |
| `OWLAPI_SERVER_URL` | Control Plane gRPC 地址（格式：`dns:///host:port`） | ✅ |
| `OWLAPI_GATEWAY_ID` | 控制台创建后获取的节点 ID | ✅ |
| `OWLAPI_GATEWAY_TOKEN` | 控制台创建后获取的节点 Token | ✅ |
| `OWLAPI_TENANT_ID` | 归属租户 ID | ✅ |
| `OWLAPI_QUERY_TIMEOUT_SECONDS` | SQL 查询执行超时（秒） | 默认 30 |
| `OWLAPI_JS_TIMEOUT_SECONDS` | JS 脚本执行超时（秒） | 默认 5 |
| `OWLAPI_LOG_LEVEL` | 日志级别（debug / info / warn / error） | 默认 info |

---

## 验证连接状态

Gateway 启动后会自动通过 gRPC 反向隧道连接 Control Plane。

在管理控制台「网关管理」中，节点状态变为 **在线（Online）** 即表示连接成功。

也可查看 Gateway 容器日志确认：

```bash
docker logs owlapi_gateway -f
```

正常启动日志示例：

```
INFO  gateway connected to control plane server=dns:///api.owlapi.cn:9090
INFO  gateway registered gateway_id=1 tenant_id=1
INFO  gateway heartbeat started interval=30s
```

---

## 常见问题

**Q: Gateway 一直处于离线状态？**

1. 检查 `OWLAPI_SERVER_URL` 是否正确，格式必须为 `dns:///host:port`
2. 确认内网机器能访问控制面的 gRPC 端口（默认 9090）：`telnet api.owlapi.cn 9090`
3. 检查 `OWLAPI_GATEWAY_ID` 和 `OWLAPI_GATEWAY_TOKEN` 是否与控制台创建的节点一致

**Q: 数据源连接测试失败？**

Gateway 连接内网数据库使用的是容器内部的网络。如果数据库在宿主机上，使用 `host.docker.internal`（Mac/Windows）或宿主机的实际 IP 地址，而不是 `localhost`。

**Q: SQLite 数据库文件无法写入？**

确保 `/data` 挂载卷的权限正确，Gateway 容器使用 `owlapi` 用户运行：

```bash
docker exec -u root owlapi_gateway chown owlapi:owlapi /data
docker restart owlapi_gateway
```
