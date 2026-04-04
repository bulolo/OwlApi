<div align="center">

# <img src="./frontend/docs/docs/public/logo.svg" width="36" style="vertical-align: middle;"> OwlApi

**企业级 SQL to API 智能网关平台**

企业级混合云智能网关，打破内网物理边界，编写 SQL 即可一键生成高可用 RESTful API，全面释放孤岛数据价值。

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go)](https://go.dev/)
[![FastAPI/Gin](https://img.shields.io/badge/Gin-1.9+-009688?logo=gin)](https://gin-gonic.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.3+-000000?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?logo=postgresql)](https://www.postgresql.org/)

[English](./README_EN.md) | 简体中文

[官网](https://owlapi.cn) |  [管理后台](https://admin.owlapi.cn) | [文档中心](https://docs.owlapi.cn)

<p>
  <a href="https://github.com/bulolo/owlapi">
    <img src="https://img.shields.io/badge/⭐_Star-项目-yellow?style=for-the-badge&logo=github" alt="Star"/>
  </a>
</p>

**如果这个项目对你有帮助，请点击右上角 ⭐ Star 支持一下，这是对开发者最大的鼓励！**

</div>

---

## 🚀 最近更新

### 2026-04-01 🌐 网关执行器演进
- 🛡️ **混合云架构**: 发布全新的架构大版本。Gateway Runner 现在可以无缝潜伏于深层内网，建立 gRPC 反向隧道通信，彻底告别公网 IP 和复杂的白名单配置。
- ⚙️ **多租户隔离**: 上线 RBAC 体系（SuperAdmin / Admin / Viewer）。实现了多数据源、多项目的严格底层权限阻断。
- 📦 **参数推断重构**: 支持在 SQL 编写时动态识别 `@变量`，一键映射并暴露为标准的 HTTP 查询参数或 Body，极大提升了 API 生成的敏捷度。
- 📚 **官网全线升级**: [owlapi.cn](https://owlapi.cn) 官网焕新，全面适配企业级 UI 体验。

---

## 🎯 项目亮点

- ✅ **开箱即用**: `make dev-up` 一键在本地拉起完整的全栈架构平台（Control Plane + Database + Admin Console 共 5 大微服务容器）。
- ✅ **物理级解耦**: 采用 Control Plane 与 Gateway Runner 分离的架构设计，确保核心控制面与数据流转层的独立安全。
- ✅ **全数据库兼容**: 开箱支持 MySQL、PostgreSQL、Oracle 以及 SQLite，跨越生态鸿沟统一查询数据。
- ✅ **边缘端就绪**: 执行核心采用 Go 1.23 精心打造。极致的内存管控方案加上单一二进制打包，使其能完美运行在树莓派甚至路由器中。
- ✅ **企业友好型 UI**: 前端控制台重构为 Next.js 15 APP Router 架构，结合 TailwindCSS 提供丝滑的桌面级管理体验。

---

## 📸 应用截图

> 🚧 截图正在准备中，敬请期待...

---

## ✨ 核心特性

### 🎯 管理后台 (Control Plane)
- **📝 API 可视化编排**: 基于 SQL 的极速创建流程，支持自动推断 Query、Body 和 Path 参数。
- **👥 RBAC 权限网**: 严密的超级管理员、运维、查看者权能管理机制。
- **🌐 项目池隔离**: 按职能、业务划分 Project。保证各个应用端点 API 与认证中心绝不交叉。

### 💬 边缘网关 (Gateway Runner)
- **🚀 零侵入部署**: 无需为数据库开辟防火墙公网口，Runner 主动在内部拨号，主动安全拦截。
- **⚡ 超高并发承载**: 充分利用 Go 语言 M:N 调度机制复用连接池，确保高密集 HTTP-to-SQL 的快速转换与发送。
- **🔒 会话密态化**: Control Plane 只管控制报文，Runner 进行密态流操作（包含查询与反序列化脱敏）。

---

## 🏗️ 技术架构

### 后端技术栈 (Control Plane & Runner)
- **核心框架**: Go 1.23+, Gin (HTTP API)
- **通信枢纽**: gRPC Server/Client (HTTP/2 反向长连接)
- **核心数据库**: PostgreSQL (pgx driver)
- **权限与认证**: JWT 体系分发校验
- **多数据库适配器**: 提供可插拔的 `dbdriver` 包动态挂载方言。

### 前端技术栈 (Admin & Web)
- **框架**: Next.js 15 (App Router 模式)
- **语言**: React 19 + TypeScript 5
- **视觉层**: Tailwind CSS 4 + Framer Motion (精美动效)
- **包管理**: pnpm / npm 

---

## 📁 项目结构

```
owlapi/
├── backend/                        # 🛡️ Go 语言核心后端（双引擎）
│   ├── cmd/
│   │   ├── server/                 # Control Plane (管控中枢启动入口)
│   │   ├── runner/                 # Gateway Runner (执行器启动入口)
│   │   └── init/                   # 预设数据挂载工具
│   ├── internal/
│   │   ├── domain/                 # 核心规约契约层
│   │   ├── service/                # 业务调度编排
│   │   ├── repo/postgres/          # DB 仓储实现
│   │   ├── transport/              # 通信报文边界 (Gin / gRPC)
│   │   └── gateway/                # ★ Gateway 底层网络引擎及生命周期
│   └── proto/                      # gRPC Protobuf 描述文件
│
├── frontend/
│   ├── admin/                      # 🎯 管理控制台 (Next.js, 8001)
│   ├── website/                    # 🌐 官方 SaaS 网站 (Next.js, 8002)
│   └── docs/                       # 📚 VitePress 文档中心 (8003)
│
├── deploy/                         # 🚀 Docker Swarm / K8S 生产部署方案库
├── docker-compose.dev.yml          # 一键拉起 5 大服务依赖谱
└── Makefile                        # 项目管理与启动脚本 (自动化工具箱)
```

### 核心目录说明

| 目录 | 职责与能力 | 技术基底 |
|------|------|--------|
| `backend/cmd/server/` | 提供前端 UI 管理接口鉴权及接收客户端直接的外部 API Proxy | Go + Gin |
| `backend/cmd/runner/` | 内网轻量级执行终端，解析执行由 gRPC 发来的 SQL Payload | Go + Database Drivers |
| `frontend/admin/` | 工程师操作面板，控制整个云原生多租户的生命链路 | Next.js 15 |

---

## 🚀 安装与配置

### 前置要求

- **Docker** >= 20.10 & **Docker Compose** V2
- **Make工具**
- **Go 环境** >= 1.23+ (如需本地原生编码)
- **Node.js** >= 20 (前端预编译依赖)

---

## ⚡ 快速开始 (3 分钟)

### 1. 克隆底层核心库
```bash
git clone https://github.com/bulolo/owlapi.git
cd owlapi
```

### 2. 调度开发环境

适合在本地 Mac 或服务器快速体验架构，支持热变更与终端全量日志：
```bash
# 执行此宏指令即可拉取镜像并顺次排布网络与依赖启动
make dev-up
```

服务将自动暴露于本地：
- 🎯 **Admin 控制台**: http://localhost:8001 `(账号: admin@owlapi.cn / admin123, 等待 init 初始化生成)` 
- 🌐 **SaaS 官网**: http://localhost:8002
- 📚 **文档中心**: http://localhost:8003
- 🚀 **RESTful Proxy 解析端口**: http://localhost:3000

---

## 🏗️ 项目管理 (Makefile)

本项目根目录提供了 `Makefile` 工具，将冗长繁复的后端重新编译、容器重置等流程抽象为单指令操作。

### 核心开发命令

| 命令 | 执行动作说明 |
|------|------|
| `make dev-up` | **启动全栈**：使用 docker-compose.dev 前台聚合式挂载所有服务，Ctrl+C 时保留数据。 |
| `make dev-down` | **停止服务**：中断所有的守护进程，不破坏任何已有的数据库配置及容器卷。 |
| `make dev-clean` | **深度清算**：将强行销毁 `owlapi_postgres_data` 卷与所有环境实例（⚠️ 数据绝不复用）。 |

---

## ❓ 常见问题 (FAQ)

> [!TIP]
> **排障铁律**: 陷入环境依赖纠纷时，使用 `make dev-clean` 并重新 `make dev-up` 可抹平 99.9% 的疑难杂症。

**Q: 执行 SQL 时提示 `Connection timeout / gRPC failed`?**
A: 请务必检查 Gateway Runner 节点日志，确保它是否能连通你的实际内网数据库，并在其启动变量中设置了正确的 Control Plane IP。

**Q: 想要扩展新的数据库适配器？**
A: 请在 `backend/internal/pkg/dbdriver/` 继承对应的 Driver 接口工厂即可。

---

## 📚 文档集装箱

深入体验更高级的网关配置，你可以通过如下路径抵达相关领域：

- 📖 [部署实战手册](./frontend/docs/docs/guide/architecture.md)
- 🚀 [RBAC 权限网解构](./frontend/docs/docs/guide/multi-tenancy.md)
- 🔌 [关于 REST API 调用的说明](./frontend/docs/docs/api/rest.md)
- 🎯 [隧道通讯规范：gRPC](./frontend/docs/docs/api/grpc.md)

---

## 📄 许可证与商业用途 (License & Commercial Use)

本项目采用 **OwlApi 开源许可证 (基于 Apache 2.0 改进)**。在保留开源灵活性的同时，我们增加了必要的条款以保护项目品牌和商业权益。

### 📌 核心准则
1. **个人/企业内部使用**：完全免费，无需额外授权。
2. **所有场景必须保留品牌**：无论何种用途，均**严禁**移除或修改 UI、控制台及 API 响应头中的 "OwlApi" 标识或版权声明。
3. **严禁未经授权的 SaaS 服务**：未经 OwlApi 官方书面授权，禁止利用本项目源码提供营利性的多租户 SaaS 服务（如：提供在线 API 网关托管、SQL to API 订阅平台等）。

### ⚠️ 为什么有此限制？
我们希望将核心技术贡献给开源社区，同时防止“去品牌化”的商业剽窃行为。如需商业授权或有合作意向，请联系官方：[owlapi.cn](https://owlapi.cn)。

详见 [LICENSE](LICENSE) 获取完整文本。

### 🤔 为什么选择此许可证？

我们参考了业界优秀的开源商业授权模式，旨在提供比 AGPL-3.0 更灵活的企业友好性，同时通过限制多租户 SaaS 服务来确保项目的核心资产和品牌得到保护。

---

<div align="center">

## 📮 联系方式

**💬 问题反馈**: [GitHub Issues](https://github.com/bulolo/owlapi/issues) &nbsp; | &nbsp; **📧 商务合作**: support@owlapi.cn / bulolo (微信) &nbsp; | &nbsp; **🌐 官方网站**: [owlapi.cn](https://owlapi.cn)

<br>

<img src="./frontend/docs/docs/public/images/wechat.jpg" width="160" alt="微信二维码">
<br>
<sub>扫码加入社区 (备注: CatWiki)</sub>

</div>

</div>

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！**

Made with ❤️ by OwlApi Team

</div>
