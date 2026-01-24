# OwlApi Cluster 部署指南

## 系统要求

- Docker 24+
- Docker Compose v2
- 2 核 CPU / 2GB 内存（最低）

## 快速部署

```bash
# 1. 下载配置
curl -O https://raw.githubusercontent.com/hongjunyao/owlapi/main/deploy/cluster/docker-compose.yml

# 2. 创建环境变量文件
cat > .env << EOF
JWT_SECRET=your-super-secret-key-here
EOF

# 3. 启动服务 (包含控制面及一个本地执行节点)
docker compose up -d

# 4. 查看日志
docker compose logs -f
```

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 3000 | Web 控制台 |
| Server HTTP | 8080 | REST API |
| Server gRPC | 9090 | 执行节点连接 |
| PostgreSQL | 5432 | 数据库（内部） |

## 常用命令

```bash
# 停止服务
docker compose down

# 更新镜像
docker compose pull
docker compose up -d

# 查看状态
docker compose ps

# 备份数据库
docker exec owlapi_db pg_dump -U postgres owlapi > backup.sql
```

## 生产建议

1. **修改密码**：PostgreSQL 默认密码需要修改
2. **配置 HTTPS**：使用 Nginx/Caddy 反向代理
3. **外置数据库**：大规模部署建议使用 RDS
