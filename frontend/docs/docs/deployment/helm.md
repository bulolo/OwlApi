# Helm 部署（Kubernetes）

本文介绍如何使用 Helm Chart 将 OwlApi 部署到 Kubernetes 集群。

## 前置条件

- Kubernetes 1.24+
- Helm 3.10+
- （可选）Ingress Controller，如 [ingress-nginx](https://kubernetes.github.io/ingress-nginx/)
- （可选）cert-manager，用于自动签发 TLS 证书

---

## 快速开始

### 克隆项目并进入 Chart 目录

```bash
git clone https://github.com/bulolo/owlapi.git
cd owlapi
```

### 最简部署（内置 PostgreSQL，无 Ingress）

```bash
helm install owlapi ./deploy/helm \
  --set backend.env.jwtSecret=$(openssl rand -hex 32) \
  --set postgres.password=$(openssl rand -hex 16) \
  --set admin.publicApiUrl=http://localhost:3000 \
  --set gateway.gatewayId=your-gateway-id \
  --set gateway.gatewayToken=your-gateway-token \
  --set gateway.tenantId=1
```

### 验证部署

```bash
kubectl get pods -l app.kubernetes.io/instance=owlapi
```

所有 Pod 处于 `Running` 状态后，本地转发访问：

```bash
kubectl port-forward svc/owlapi-admin 8001:8001
kubectl port-forward svc/owlapi-backend 3000:3000
```

---

## 部署架构

```
┌─────────────────────────────────────────────┐
│              Kubernetes Cluster             │
│                                             │
│  Ingress ──► admin-svc ──► admin Pod        │
│          └─► backend-svc ─► backend Pod     │
│                              │  gRPC        │
│  gateway Pod ◄───────────────┘              │
│                                             │
│  postgres StatefulSet (内置 or 外部 DB)      │
│  sdkbuilder Pod (EE, 可选)                  │
└─────────────────────────────────────────────┘
```

| 组件 | 类型 | 说明 |
| :--- | :--- | :--- |
| `backend` | Deployment | 控制面 API（HTTP :3000 / gRPC :9090） |
| `admin` | Deployment | 管理后台 Next.js（:8001） |
| `gateway` | Deployment + PVC | 数据面网关节点 |
| `postgres` | StatefulSet + PVC | 内置数据库，可替换为外部 PG |
| `init` | Job（Hook） | 数据库 migration + 初始数据，升级时自动执行 |
| `sdkbuilder` | Deployment（EE） | SDK 生成 sidecar，默认关闭 |

---

## 配置参数

所有参数均在 `deploy/helm/values.yaml` 中定义，可通过 `--set` 或 `-f values.yaml` 覆盖。

### 必填项

| 参数 | 说明 |
| :--- | :--- |
| `backend.env.jwtSecret` | JWT 签名密钥，生产环境使用 `openssl rand -hex 32` 生成 |
| `postgres.password` | 数据库密码（内置 PG 时必填） |
| `admin.publicApiUrl` | 浏览器可访问的 API 地址，如 `https://api.example.com` |
| `gateway.gatewayId` | 在管理后台创建网关节点后获取 |
| `gateway.gatewayToken` | 网关认证 Token |
| `gateway.tenantId` | 网关所属租户 ID |

### 常用可选项

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `image.tag` | `v0.2.1` | 镜像版本，建议固定到具体版本 |
| `backend.env.edition` | `ce` | `ce` 或 `ee` |
| `backend.env.licenseKey` | `""` | EE License Key |
| `backend.env.corsOrigin` | `*` | CORS 允许来源，生产建议改为具体域名 |
| `gateway.enabled` | `true` | 关闭则不部署内置网关 |
| `postgres.enabled` | `true` | 关闭则使用外部数据库 |
| `postgres.storage` | `10Gi` | 数据库存储大小 |
| `ee.sdkbuilder.enabled` | `false` | 启用 EE SDK Builder |
| `ingress.enabled` | `false` | 是否创建 Ingress |

---

## 典型场景

### 场景一：生产环境 + Ingress + TLS

```bash
helm install owlapi ./deploy/helm \
  --set backend.env.jwtSecret=$(openssl rand -hex 32) \
  --set backend.env.corsOrigin=https://admin.example.com \
  --set postgres.password=$(openssl rand -hex 16) \
  --set admin.publicApiUrl=https://api.example.com \
  --set gateway.gatewayId=gw-prod \
  --set gateway.gatewayToken=tok-prod \
  --set gateway.tenantId=1 \
  --set ingress.enabled=true \
  --set ingress.tls.enabled=true \
  --set ingress.tls.secretName=owlapi-tls \
  --set ingress.admin.host=admin.example.com \
  --set ingress.api.host=api.example.com \
  --set 'ingress.annotations.nginx\.ingress\.kubernetes\.io/proxy-read-timeout=300'
```

TLS 证书可通过 cert-manager 自动签发，或手动创建：

```bash
kubectl create secret tls owlapi-tls --cert=tls.crt --key=tls.key
```

### 场景二：EE 版 + 外部数据库 + SDK Builder

```bash
helm install owlapi ./deploy/helm \
  --set backend.env.edition=ee \
  --set backend.env.jwtSecret=$(openssl rand -hex 32) \
  --set backend.env.licenseKey=$OWLAPI_LICENSE_KEY \
  --set admin.publicApiUrl=https://api.example.com \
  --set gateway.gatewayId=gw-ee \
  --set gateway.gatewayToken=tok-ee \
  --set gateway.tenantId=1 \
  --set postgres.enabled=false \
  --set postgres.external.host=pg.internal.example.com \
  --set postgres.user=owlapi \
  --set postgres.password=$DB_PASSWORD \
  --set postgres.database=owlapi \
  --set ee.sdkbuilder.enabled=true \
  --set ingress.enabled=true \
  --set ingress.admin.host=admin.example.com \
  --set ingress.api.host=api.example.com
```

### 场景三：使用 values 文件（推荐生产环境）

将固定配置写入文件，敏感值通过 CI/CD 环境变量注入：

```yaml
# my-values.yaml
image:
  tag: v0.2.1

backend:
  env:
    edition: ee
    corsOrigin: "https://admin.example.com"

admin:
  publicApiUrl: https://api.example.com

gateway:
  tenantId: "1"

postgres:
  enabled: false
  external:
    host: pg.internal.example.com
  user: owlapi
  database: owlapi

ee:
  sdkbuilder:
    enabled: true

ingress:
  enabled: true
  tls:
    enabled: true
    secretName: owlapi-tls
  admin:
    host: admin.example.com
  api:
    host: api.example.com
```

```bash
helm install owlapi ./deploy/helm -f my-values.yaml \
  --set backend.env.jwtSecret=$JWT_SECRET \
  --set backend.env.licenseKey=$LICENSE_KEY \
  --set postgres.password=$DB_PASSWORD \
  --set gateway.gatewayId=$GATEWAY_ID \
  --set gateway.gatewayToken=$GATEWAY_TOKEN
```

---

## 升级与回滚

```bash
# 升级版本（migration Job 自动在 pre-upgrade 阶段执行）
helm upgrade owlapi ./deploy/helm -f my-values.yaml --set image.tag=v0.2.2

# 查看发布历史
helm history owlapi

# 回滚到上一版本
helm rollback owlapi

# 回滚到指定版本
helm rollback owlapi 2
```

::: tip migration 自动执行
`init` 是一个 Helm pre-upgrade Hook，每次 `helm upgrade` 时会自动运行数据库 migration，无需手动操作。
:::

---

## 数据持久化

| 资源 | 组件 | 说明 |
| :--- | :--- | :--- |
| `StatefulSet volumeClaimTemplates` | postgres | 数据库文件，随 StatefulSet 创建 |
| `PersistentVolumeClaim` | gateway | 网关 SQLite 缓存与日志 |

::: warning 卸载注意
`helm uninstall` 不会删除 PVC，数据默认保留：

```bash
helm uninstall owlapi

# 确认不再需要数据后手动清理
kubectl delete pvc -l app.kubernetes.io/instance=owlapi
```
:::

---

## 常见问题

**Q：init Job 失败怎么办？**

查看 Job 日志：

```bash
kubectl logs -l app.kubernetes.io/component=init
```

通常原因是数据库连接失败，检查 `postgres.password` 和 `postgres.external.host` 配置是否正确。

**Q：Gateway 连接不上 backend？**

`gateway.serverUrl` 留空时自动指向集群内 backend Service（`http://owlapi-backend:3000`）。如果 Release 名称不是 `owlapi`，需显式设置：

```bash
--set gateway.serverUrl=http://<release-name>-backend:3000
```

**Q：如何查看运行日志？**

```bash
kubectl logs -l app.kubernetes.io/component=backend -f
kubectl logs -l app.kubernetes.io/component=gateway -f
kubectl logs -l app.kubernetes.io/component=admin -f
```
