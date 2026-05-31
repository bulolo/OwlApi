# ==============================================================================
# owlapi-sdk-builder
#
# 独立 sidecar：封装 openapi-generator-cli，无状态，给主 backend 通过 HTTP 调用。
# 镜像较大（含 JRE + Node），所以做成独立服务而不是塞进 backend 主镜像。
# ==============================================================================

# 1) Go 编译阶段：复用 backend 模块根，单独编译 sdkbuilder 命令
FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    GOPROXY=https://goproxy.cn,direct go mod download

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /sdkbuilder ./cmd/sdkbuilder

# 2) Runtime: Node + JRE + openapi-generator-cli
#
# 用 node:20-alpine 而不是 eclipse-temurin:17-jre-alpine：后者只发布了 linux/amd64
# manifest，Apple Silicon 拉不到。node:20-alpine 是 alpine 3.20 多架构镜像，
# openjdk17-jre-headless 在 alpine community repo 里 amd64/arm64 都有。
FROM node:20-alpine

RUN apk --no-cache add openjdk17-jre-headless tini ca-certificates \
 && npm install -g @openapitools/openapi-generator-cli@2.13.4 \
 && openapi-generator-cli version

WORKDIR /app
COPY --from=builder /sdkbuilder /app/sdkbuilder

EXPOSE 7100
ENV SDKBUILDER_PORT=7100

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:7100/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/sdkbuilder"]
