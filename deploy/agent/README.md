# OwlApi Gateway Agent 部署指南

## 快速开始

### 1. 创建网关
登录 [OwlApi 控制台](https://console.owlapi.io) -> 项目设置 -> 网关管理 -> 创建网关

### 2. 部署 Agent

```bash
# 下载配置文件
curl -O https://raw.githubusercontent.com/hongjunyao/owlapi/main/deploy/agent/docker-compose.yml

# 编辑配置
vim docker-compose.yml

# 启动
docker compose up -d

# 查看日志
docker compose logs -f
```

### 3. 验证连接
在控制台查看网关状态变为"在线"即表示连接成功。

## 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `OWLAPI_SERVER_URL` | ✅ | 服务器地址 |
| `OWLAPI_AGENT_ID` | ✅ | 网关 ID |
| `OWLAPI_AGENT_TOKEN` | ✅ | 网关密钥 |
| `OWLAPI_LOG_LEVEL` | ❌ | 日志级别（默认 info） |

## 常见问题

**Q: Agent 无法连接服务器？**
- 检查网络是否能访问 `OWLAPI_SERVER_URL`
- 确认防火墙允许出站 TCP 9090 端口

**Q: 如何更新 Agent？**
```bash
docker compose pull
docker compose up -d
```
