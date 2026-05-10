# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    GOPROXY=https://goproxy.cn,direct go mod download

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /server ./cmd/server && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /init ./cmd/init

# Runtime stage
FROM alpine:3.21

RUN apk --no-cache add ca-certificates tzdata \
    && addgroup -S owlapi && adduser -S owlapi -G owlapi

WORKDIR /app

COPY --from=builder /server .
COPY --from=builder /init .

RUN chown owlapi:owlapi /app/server /app/init

USER owlapi

EXPOSE 3000 9090

CMD ["./server"]
