# 代码生成

## gRPC Proto 生成

Gateway 与 Control Plane 之间通过 gRPC 双向流通信。Proto 定义文件位于 `backend/proto/gateway.proto`，生成文件位于 `backend/internal/pb/`。

### 前置依赖

```bash
# macOS
brew install protobuf protoc-gen-go protoc-gen-go-grpc

# 验证
protoc --version
protoc-gen-go --version
protoc-gen-go-grpc --version
```

### 生成命令

```bash
# 在项目根目录执行
make gen-proto
```

等价于：

```bash
cd backend && protoc \
  --go_out=internal/pb --go-grpc_out=internal/pb \
  --go_opt=paths=source_relative --go-grpc_opt=paths=source_relative \
  -I proto proto/gateway.proto
```

生成文件：
- `backend/internal/pb/gateway.pb.go` — 消息类型定义
- `backend/internal/pb/gateway_grpc.pb.go` — gRPC 服务接口

## 前端 SDK 生成

前端 TypeScript SDK 从 OpenAPI 规范自动生成。规范来源于 backend 的 Swagger 注解。

### 前置依赖

```bash
cd frontend/admin && pnpm install
```

### 生成命令

```bash
# 在项目根目录执行（先更新 swagger.json，再生成 SDK）
make gen-sdk
```

::: warning
请始终使用 `make gen-sdk` 而非直接运行 `npm run gen-sdk`。`make gen-sdk` 会先执行 `make gen-swagger` 更新 `backend/docs/swagger.json`，再生成 SDK，确保两者同步。
:::

生成文件位于 `frontend/admin/src/lib/sdk/`：

| 文件 | 说明 |
| :--- | :--- |
| `types.gen.ts` | 所有 TypeScript 类型定义 |
| `sdk.gen.ts` | 所有 API 调用函数 |
| `client.gen.ts` | HTTP 客户端实例 |

生成工具：[@hey-api/openapi-ts](https://heyapi.dev)，配置见 `frontend/admin/openapi-ts.config.ts`。
