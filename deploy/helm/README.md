# OwlApi Helm Chart

将 OwlApi 部署到 Kubernetes 集群。

## 前置条件

- Kubernetes 1.24+
- Helm 3.10+
- （可选）Ingress Controller（如 ingress-nginx）

## 快速开始

```bash
# 最简部署（内置 PostgreSQL，不开 Ingress）
helm install owlapi ./deploy/helm \
  --set backend.env.jwtSecret=your-jwt-secret \
  --set postgres.password=your-db-password \
  --set admin.publicApiUrl=http://localhost:3000 \
  --set gateway.gatewayId=your-gateway-id \
  --set gateway.gatewayToken=your-gateway-token \
  --set gateway.tenantId=1

# 验证部署
kubectl get pods -l app.kubernetes.io/instance=owlapi

# 本地访问
kubectl port-forward svc/owlapi-admin 8001:8001
kubectl port-forward svc/owlapi-backend 3000:3000
```

## 配置说明

所有可配置项均在 `values.yaml` 中，下表列出常用参数。

### 镜像

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `image.registry` | `registry.cn-hangzhou.aliyuncs.com/owlapi` | 镜像仓库地址 |
| `image.tag` | `v0.2.1` | 镜像版本，建议固定到具体版本号 |
| `image.pullPolicy` | `IfNotPresent` | 镜像拉取策略 |

### Backend

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `backend.replicas` | `1` | 副本数 |
| `backend.env.jwtSecret` | `""` | **必填**，JWT 签名密钥，生产环境使用强随机值 |
| `backend.env.licenseKey` | `""` | EE License Key，CE 版留空 |
| `backend.env.edition` | `ce` | 版本：`ce` 或 `ee` |
| `backend.env.logLevel` | `info` | 日志级别：`debug` / `info` / `warn` / `error` |
| `backend.env.corsOrigin` | `*` | CORS 允许来源，生产环境建议改为具体域名 |

### Admin 前端

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `admin.replicas` | `1` | 副本数 |
| `admin.publicApiUrl` | `""` | **必填**，浏览器可访问的 API 地址，如 `https://api.example.com` |

### Gateway 网关

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `gateway.enabled` | `true` | 是否部署内置网关节点 |
| `gateway.serverUrl` | `""` | 留空时自动指向集群内 backend Service |
| `gateway.gatewayId` | `""` | **必填（启用时）**，在管理后台创建网关后获取 |
| `gateway.gatewayToken` | `""` | **必填（启用时）**，网关认证 Token |
| `gateway.tenantId` | `""` | **必填（启用时）**，网关所属租户 ID |
| `gateway.storage` | `1Gi` | 网关数据持久化存储大小 |

### PostgreSQL

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `postgres.enabled` | `true` | `false` 时使用外部数据库 |
| `postgres.password` | `""` | **必填**，数据库密码 |
| `postgres.storage` | `10Gi` | 数据持久化存储大小 |
| `postgres.storageClass` | `""` | StorageClass，留空使用集群默认 |
| `postgres.external.host` | `""` | 外部数据库地址（`postgres.enabled=false` 时填写） |
| `postgres.external.port` | `5432` | 外部数据库端口 |

### EE：SDK Builder

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `ee.sdkbuilder.enabled` | `false` | 启用后 backend 自动获得 SDK 发布能力 |

### Ingress

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `ingress.enabled` | `false` | 是否创建 Ingress |
| `ingress.className` | `nginx` | IngressClass 名称 |
| `ingress.annotations` | `{}` | 自定义注解，如超时、认证等 |
| `ingress.admin.host` | `admin.example.com` | Admin 前端域名 |
| `ingress.api.host` | `api.example.com` | Backend API 域名 |
| `ingress.tls.enabled` | `false` | 是否启用 TLS |
| `ingress.tls.secretName` | `owlapi-tls` | TLS 证书 Secret 名称 |

## 典型部署场景

### 场景一：开发 / 测试环境

内置 PostgreSQL，port-forward 访问，不配置 Ingress。

```bash
helm install owlapi ./deploy/helm \
  --set backend.env.jwtSecret=dev-secret \
  --set postgres.password=dev-password \
  --set admin.publicApiUrl=http://localhost:3000 \
  --set gateway.gatewayId=gw-001 \
  --set gateway.gatewayToken=tok-xxx \
  --set gateway.tenantId=1
```

### 场景二：生产环境 + Ingress + TLS

```bash
helm install owlapi ./deploy/helm \
  --set backend.env.jwtSecret=$(openssl rand -hex 32) \
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

TLS 证书可通过 cert-manager 自动签发，或手动创建 Secret：

```bash
kubectl create secret tls owlapi-tls \
  --cert=tls.crt \
  --key=tls.key
```

### 场景三：EE 版 + 外部数据库 + SDK Builder

```bash
helm install owlapi ./deploy/helm \
  --set backend.env.edition=ee \
  --set backend.env.jwtSecret=$(openssl rand -hex 32) \
  --set backend.env.licenseKey=eyJ... \
  --set admin.publicApiUrl=https://api.example.com \
  --set gateway.gatewayId=gw-ee \
  --set gateway.gatewayToken=tok-ee \
  --set gateway.tenantId=1 \
  --set postgres.enabled=false \
  --set postgres.external.host=pg.internal.example.com \
  --set postgres.user=owlapi \
  --set postgres.password=prod-db-pass \
  --set postgres.database=owlapi \
  --set ee.sdkbuilder.enabled=true \
  --set ingress.enabled=true \
  --set ingress.admin.host=admin.example.com \
  --set ingress.api.host=api.example.com
```

### 使用 values 文件（推荐）

生产环境建议将配置写入独立文件，敏感值通过 Secrets Manager 或 CI 变量注入：

```yaml
# my-values.yaml
image:
  tag: v0.2.1

backend:
  env:
    jwtSecret: ""        # 由 CI 注入
    edition: ee
    licenseKey: ""       # 由 CI 注入
    corsOrigin: "https://admin.example.com"

admin:
  publicApiUrl: https://api.example.com

gateway:
  gatewayId: ""          # 由 CI 注入
  gatewayToken: ""       # 由 CI 注入
  tenantId: "1"

postgres:
  enabled: false
  external:
    host: pg.internal.example.com
  user: owlapi
  password: ""           # 由 CI 注入
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

## 升级与回滚

```bash
# 升级
helm upgrade owlapi ./deploy/helm -f my-values.yaml --set image.tag=v0.2.2

# 查看历史
helm history owlapi

# 回滚到上一版本
helm rollback owlapi
```

升级时 init Job（migration）会作为 pre-upgrade Hook 自动执行，无需手动操作。

## 卸载

```bash
helm uninstall owlapi

# PVC 默认保留，需手动清理
kubectl delete pvc -l app.kubernetes.io/instance=owlapi
```
