<div align="center">

# <img src="./frontend/docs/docs/public/logo.svg" width="36" style="vertical-align: middle;"> OwlApi

**Enterprise-grade SQL to API Intelligent Gateway Platform**

An enterprise-grade hybrid cloud intelligent gateway that breaks physical network boundaries. Write SQL to generate high-availability RESTful APIs in one click, fully unleashing the value of siloed data.

[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)](https://go.dev/)
[![FastAPI/Gin](https://img.shields.io/badge/Gin-1.9+-009688?logo=gin)](https://gin-gonic.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-000000?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18+-336791?logo=postgresql)](https://www.postgresql.org/)

English | [简体中文](./README.md)

[Official Website](https://owlapi.cn) | [Admin Console](https://admin.owlapi.cn) | [Documentation](https://docs.owlapi.cn)

<p>
  <a href="https://github.com/bulolo/owlapi">
    <img src="https://img.shields.io/badge/⭐_Star-Project-yellow?style=for-the-badge&logo=github" alt="Star"/>
  </a>
</p>

**If this project helps you, please give us a ⭐ Star! It's the best encouragement for developers!**

</div>

---

## 🚀 Recent Updates

### 2026-04-01 🌐 Gateway Executor Evolution
- 🛡️ **Hybrid Cloud Architecture**: Released a major architectural update. Gateway can now seamlessly "lurk" in deep internal networks, establishing gRPC reverse tunnel communication, completely eliminating the need for public IPs and complex whitelist configurations.
- ⚙️ **Multi-tenancy Isolation**: Launched the RBAC system (SuperAdmin / Admin / Viewer). Implemented strict low-level permission blocking for multiple data sources and projects.
- 📦 **Parameter Inference Refactor**: Supports dynamic identification of `@variables` during SQL writing, mapping and exposing them as standard HTTP Query parameters or Body fields, greatly enhancing API generation agility.
- 📚 **Website Upgrade**: [owlapi.cn](https://owlapi.cn) has been fully upgraded with an enterprise-grade UI experience.

---

## 🎯 Project Highlights

- ✅ **Out-of-the-Box**: `make dev-up` launches the full-stack platform (Control Plane + Gateway + Database + Admin Console + Docs, total 6 service containers) locally in one click.
- ✅ **Physical Decoupling**: Designed with a separation of Control Plane and Gateway, ensuring independent security for core control and data flow layers.
- ✅ **Full Database Compatibility**: Native support for PostgreSQL and SQLite, with built-in DSN recognition logic for MySQL, SQL Server, StarRocks, and Doris, unifying data queries across ecosystems.
- ✅ **Edge-Ready**: Execution core built with Go 1.25. Extreme memory management and single-binary packaging make it perfect for Raspberry Pi or even routers.
- ✅ **Enterprise-Friendly UI**: Admin console rebuilt with Next.js 16 App Router architecture, combined with Tailwind CSS for a smooth, desktop-grade management experience.

---

## 📸 Screenshots

<p align="center">
  <img src="./frontend/docs/docs/public/images/1.png" width="800" alt="Dashboard">
</p>
<p align="center">
  <img src="./frontend/docs/docs/public/images/2.png" width="800" alt="Projects">
</p>

---

## ✨ Core Features

### 🎯 Control Plane
- **📝 Visual API Orchestration**: SQL-based rapid creation process, supporting automatic inference of Query, Body, and Path parameters.
- **👥 RBAC Permission Network**: Strict management of SuperAdmin, Admin, and Viewer roles.
- **🌐 Project Isolation**: Organize Projects by function or business, ensuring absolute isolation between API endpoints and authentication centers.

### 💬 Gateway (Edge Executor)
- **🚀 Zero-Intrusion Deployment**: No need to open firewall ports for the database. The Gateway actively dials out from within the network for proactive security.
- **⚡ High Concurrency Support**: Leverages Go's M:N scheduling and connection pooling to ensure rapid HTTP-to-SQL conversion and execution.
- **🔒 Encrypted Sessions**: The Control Plane only handles control messages; the Gateway performs encrypted stream operations (including query and de-serialization masking).

---

## 🏗️ Technical Architecture

### Backend Stack (Control Plane & Gateway)
- **Core Framework**: Go 1.25+, Gin (HTTP API)
- **Communication Hub**: gRPC Server/Client (HTTP/2 Reverse Long Connection)
- **Core Database**: PostgreSQL (pgx driver)
- **Auth**: JWT-based distribution and verification
- **DB Adapters**: PostgreSQL, SQLite (integrated drivers); MySQL, SQL Server, StarRocks, Doris (DSN recognition ready, drivers need to be added manually)

### Frontend Stack (Admin & Web)
- **Framework**: Next.js 16 (App Router)
- **Language**: React 19 + TypeScript 5
- **Visuals**: Tailwind CSS 4 + Framer Motion (premium animations)
- **Package Management**: pnpm / npm 

---

## 📁 Project Structure

```
owlapi/
├── backend/                        # 🛡️ Go Core Backend (Dual Engines)
│   ├── cmd/
│   │   ├── server/                 # Control Plane (Management Center)
│   │   ├── gateway/                 # Gateway (Executor)
│   │   └── init/                   # Preset Data Seeding Tool
│   ├── internal/
│   │   ├── domain/                 # Core Domain Models & Interfaces
│   │   ├── service/                # Business Logic Orchestration
│   │   ├── repo/postgres/          # DB Repository Implementation
│   │   ├── transport/              # Communication Layer (Gin / gRPC)
│   │   └── gateway/                # ★ Gateway Engine & Lifecycle
│   └── proto/                      # gRPC Protobuf Definitions
│
├── frontend/
│   ├── admin/                      # 🎯 Admin Console (Next.js, 8001)
│   ├── website/                    # 🌐 Official SaaS Website (Next.js, 8002)
│   └── docs/                       # 📚 VitePress Documentation (8003)
│
├── deploy/                         # 🚀 Docker Swarm / K8S Deployment Scenarios
├── docker-compose.dev.yml          # One-click dev environment
└── Makefile                        # Project management and scripts
```

### Core Directory Description

| Directory | Responsibility | Tech Base |
|------|------|--------|
| `backend/cmd/server/` | Handles UI management, authentication, and external API Proxy | Go + Gin |
| `backend/cmd/gateway/` | Lightweight executor in internal networks, executes SQL payloads via gRPC | Go + DB Drivers |
| `frontend/admin/` | Engineer console for managing the multi-tenant lifecycle | Next.js 16 |

---

## 🚀 Installation & Configuration

### Prerequisites

- **Docker** >= 20.10 & **Docker Compose** V2
- **Make**
- **Go** >= 1.25+ (for local development)
- **Node.js** >= 20 (for frontend builds)

---

## ⚡ Quick Start (3 Minutes)

### 1. Clone the repository
```bash
git clone https://github.com/bulolo/owlapi.git
cd owlapi
```

### 2. Launch development environment

Best for quick experience on Mac or Linux, supporting hot-reload and full logs:
```bash
# Pull images and start services in order
make dev-up
```

Services will be available locally:
- 🎯 **Admin Console**: http://localhost:8001 `(Default: admin@owlapi.cn / admin123)` 
- 📚 **Documentation**: http://localhost:8003
- 🌐 **RESTful API Service**: http://localhost:3000
- 🐘 **PostgreSQL**: localhost:5433

---

## 🏗️ Project Management (Makefile)

The root `Makefile` abstracts complex backend compilation and container management into simple commands.

### Core Commands

| Command | Action |
|------|------|
| `make dev-up` | **Start All**: Use docker-compose.dev to run all services in foreground. Data is persisted on Ctrl+C. |
| `make dev-down` | **Stop Services**: Interrupt all daemons without destroying DB configs or volumes. |
| `make dev-clean` | **Deep Clean**: Forcefully destroy all volumes (including `postgres_data`) and instances. |

---

## ❓ FAQ

> [!TIP]
> **Troubleshooting Gold Rule**: If you hit dependency or environment issues, run `make dev-clean` and then `make dev-up` to solve 99.9% of problems.

**Q: Seeing `Connection timeout / gRPC failed` when executing SQL?**
A: Check Gateway logs to ensure it can reach your internal database and that the Control Plane IP is correctly configured in its environment variables.

**Q: Want to extend support for new database adapters?**
A: Add DSN recognition logic to `resolveDriver` in `backend/internal/gateway/executor.go` and import the corresponding driver package.

---

## 📚 Documentation

Dive deeper into advanced gateway configurations:

- 📖 [Architecture Guide](./frontend/docs/docs/guide/architecture.md)
- 🚀 [RBAC & Multi-tenancy](./frontend/docs/docs/guide/multi-tenancy.md)
- 🔌 [REST API Usage](./frontend/docs/docs/api/rest.md)
- 🎯 [Tunnel Protocol: gRPC](./frontend/docs/docs/api/grpc.md)

---

## 📄 License & Commercial Use

This project is licensed under the **OwlApi Open Source License (based on Apache 2.0)**. We've added terms to protect the brand and commercial interests while maintaining open-source flexibility.

### 📌 Core Principles
1. **Personal/Internal Use**: Completely free, no extra authorization needed.
2. **Mandatory Branding**: You **must** retain "OwlApi" branding/copyright in UI, consoles, and API headers in all scenarios.
3. **No Unauthorized SaaS**: You are prohibited from providing commercial multi-tenant SaaS services (e.g., hosted API gateways, SQL to API platforms) using this source code without official written authorization.

### ⚠️ Why these restrictions?
We want to contribute technology to the community while preventing "de-branded" commercial plagiarism. For commercial licensing, contact: [owlapi.cn](https://owlapi.cn).

See [LICENSE](LICENSE) for the full text.

---

<div align="center">

## 📮 Contact

**💬 Feedback**: [GitHub Issues](https://github.com/bulolo/owlapi/issues) &nbsp; | &nbsp; **📧 Business**: support@owlapi.cn / bulolo (WeChat) &nbsp; | &nbsp; **🌐 Website**: [owlapi.cn](https://owlapi.cn)

<br>

<img src="./frontend/docs/docs/public/images/wechat.jpg" width="160" alt="WeChat QR Code">
<br>
<sub>Scan to join the community (Note: OwlApi)</sub>

</div>

---

<div align="center">

**⭐ If this project is helpful, please give us a Star!**

Made with ❤️ by OwlApi Team

</div>
