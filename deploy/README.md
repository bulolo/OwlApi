# OwlApi 部署指南

## 系统要求

- Docker 24+
- Docker Compose v2
- 2 核 CPU / 2GB 内存（最低）

## 一、Cluster 部署（控制面 + 本地网关）

```bash
# 1. 下载配置
curl -O https://raw.githubusercontent.com/hongjunyao/owlapi/main/deploy/docker-compose.yml

# 2. 创建环境变量文件
cat > .env << EOF
JWT_SECRET=your-super-secret-key-here
EOF

# 3. 启动服务 (包含控制面及一个本地网关节点)
docker compose up -d

# 4. 查看日志
docker compose logs -f
```

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Admin | 8001 | Web 控制台 |
| Backend HTTP | 3000 | REST API |
| Backend gRPC | 9090 | 网关节点连接 |
| PostgreSQL | 5432 | 数据库（内部） |

### 常用命令

```bash
# 停止服务
docker compose down

# 更新镜像
docker compose pull
docker compose up -d

# 查看状态
docker compose ps

# 备份数据库
docker exec owlapi_postgres pg_dump -U postgres owlapi > backup.sql
```

## 二、独立 Gateway 部署

Gateway（网关节点）是 OwlApi 的执行单元，通常部署在数据库所在的内网环境中，通过安全隧道连接至控制面。

```bash
# 1. 下载配置
curl -O https://raw.githubusercontent.com/hongjunyao/owlapi/main/deploy/docker-compose.gateway.yml

# 2. 修改环境变量
# 编辑 docker-compose.gateway.yml 填入从控制台获取的 GATEWAY_ID 和 GATEWAY_TOKEN

# 3. 启动
docker compose -f docker-compose.gateway.yml up -d
```

### 环境变量说明

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `OWLAPI_SERVER_URL` | ✅ | 控制面 gRPC 地址 | `https://api.owlapi.io` |
| `GATEWAY_ID` | ✅ | 网关节点 ID | `gateway-01` |
| `GATEWAY_TOKEN` | ✅ | 网关节点 Token | `xxxxxxxx` |
| `OWLAPI_LOG_LEVEL` | ❌ | 日志级别（默认 info） | `info` |

### 常见问题

**Q: Gateway 无法连接服务器？**
- 确认防火墙允许出站 TCP 9090 端口

**Q: 如何更新 Gateway？**
```bash
docker compose -f docker-compose.gateway.yml pull
docker compose -f docker-compose.gateway.yml up -d
```

## 三、生产建议

1. 修改密码：PostgreSQL 默认密码需要修改
2. 配置 HTTPS：使用 Nginx/Caddy 反向代理
3. 外置数据库：大规模部署建议使用 RDS
