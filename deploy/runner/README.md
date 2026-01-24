# OwlApi Runner 部署指南

## 简介

Runner（执行节点）是 OwlApi 的执行单元，通常部署在数据库所在的内网环境中，通过安全隧道连接至控制面。

## 快速启动

```bash
# 1. 下载配置
curl -O https://raw.githubusercontent.com/hongjunyao/owlapi/main/deploy/runner/docker-compose.yml

# 2. 修改环境变量
# 编辑 docker-compose.yml 填入从控制台获取的 OWLAPI_RUNNER_ID 和 OWLAPI_RUNNER_TOKEN

# 3. 启动
docker compose up -d
```

## 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| OWLAPI_SERVER_URL | 控制面 gRPC 地址 | https://api.owlapi.io |
| OWLAPI_RUNNER_ID | 执行节点 ID | runner-01 |
| OWLAPI_RUNNER_TOKEN | 执行节点 Token | xxxxxxxx |
| `OWLAPI_LOG_LEVEL` | ❌ | 日志级别（默认 info） |

## 常见问题

**Q: Runner 无法连接服务器？**
- 确认防火墙允许出站 TCP 9090 端口

**Q: 如何更新 Runner？**
```bash
docker compose pull
docker compose up -d
```
