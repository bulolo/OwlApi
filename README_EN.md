<div align="center">

# <img src="./frontend/docs/docs/public/logo.svg" width="36" style="vertical-align: middle;"> OwlApi

**Enterprise-grade SQL to API Intelligent Gateway Platform**

An enterprise-grade hybrid cloud intelligent gateway that breaks physical network boundaries. Write SQL to generate high-availability RESTful APIs in one click, fully unleashing the value of siloed data.

[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)](https://go.dev/)
[![Gin](https://img.shields.io/badge/Gin-1.9+-009688?logo=gin)](https://gin-gonic.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-000000?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18+-336791?logo=postgresql)](https://www.postgresql.org/)

English | [简体中文](./README.md)

[Official Website](https://owlapi.cn) | [Admin Console](https://admin.owlapi.cn) | [Documentation](https://docs.owlapi.cn)

<p>
  <a href="https://github.com/bulolo/owlapi">
    <img src="https://img.shields.io/badge/⭐_Star-Project-yellow?style=for-the-badge&logo=github" alt="Star"/>
  </a>
</p>

**If this project helps you, please give us a ⭐ Star — it's the best encouragement for the team!**

</div>

---

## 🚀 Recent Updates

### 2026-05-13 🗄️ Full Multi-Database Support
- 🔌 **Six Database Types**: Added full support for MySQL, PostgreSQL, SQL Server, SQLite, StarRocks, and Apache Doris — all drivers integrated out of the box.
- 🖥️ **Data Browser**: Visually browse remote database schemas and table data without any external tools.
- 📋 **Structured Connection Form**: Datasource setup no longer requires hand-writing DSNs — fill in fields like Host, Port, and Credentials through a guided form.

### 2026-04-01 🌐 Gateway Executor Evolution
- 🛡️ **Hybrid Cloud Architecture**: Released a major architectural update. The Gateway can now be deployed directly inside deep internal networks and proactively establishes a gRPC reverse tunnel to the Control Plane — eliminating the need for public IPs and complex firewall rules.
- ⚙️ **Multi-tenancy Isolation**: Launched a full RBAC system (SuperAdmin / Admin / Viewer) with strict permission isolation across data sources and projects.
- 📦 **Parameter Inference**: Dynamically detects `:variables` in SQL at write time and maps them to standard HTTP Query or Body parameters in one step.
- 📚 **Website Redesign**: [owlapi.cn](https://owlapi.cn) fully refreshed with an enterprise-grade UI.

---

## 💡 Use Cases

| Scenario | Description |
|------|------|
| 🏢 **Internal Data Exposure** | Safely expose databases behind ERP, MES, or WMS systems as standard REST APIs for frontend or third-party consumption — no changes to existing systems required. |
| 📊 **Reporting & Query APIs** | Business and data teams write SQL to generate query APIs directly, removing backend dependency and delivering data in minutes. |
| 🔗 **Cross-system Data Integration** | Unify heterogeneous databases (MySQL, SQL Server, PostgreSQL, etc.) under a single API layer, abstracting away backend differences and simplifying integration. |
| 🚀 **Rapid Prototyping & MVP** | Skip backend development entirely — generate CRUD APIs directly from an existing database to validate ideas fast. |
| 🛡️ **Database Access Gateway** | Replace direct DB connections with an API gateway for unified auth, parameter validation, and access auditing — no more exposing database credentials to applications. |

---

## 🎯 Project Highlights

- ✅ **Out-of-the-Box**: `make dev-up` launches the full stack (Control Plane + Gateway + Database + Admin Console + Docs — 6 containers) in one command.
- ✅ **Physical Decoupling**: Control Plane and Gateway run as separate services, ensuring the control layer and data execution layer are independently secured.
- ✅ **Full Database Compatibility**: Native support for MySQL, PostgreSQL, SQL Server, SQLite, StarRocks, and Apache Doris — six database types, all drivers integrated.
- ✅ **Edge-Ready**: The Gateway is built with Go 1.25 — single binary, minimal memory footprint — and runs reliably on resource-constrained edge devices like Raspberry Pi, NAS boxes, or soft routers.
- ✅ **Enterprise-Friendly UI**: Admin console built on Next.js 16 App Router with Tailwind CSS, delivering a smooth desktop-grade management experience.

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

### 🎯 Control Plane (Admin Console)
- **📝 Visual API Orchestration**: SQL-based rapid API creation with automatic inference of Query, Body, and Path parameters.
- **👥 RBAC Permission Management**: Three built-in role tiers — SuperAdmin, Admin, and Viewer — with fine-grained control over resource access per tenant.
- **🌐 Project Isolation**: Organize APIs into Projects by business domain. Each project's endpoints and credentials are fully independent and do not interfere with one another.

### 🌐 Gateway (Executor)
- **🚀 Zero-Intrusion Deployment**: No database firewall ports need to be opened. The Gateway initiates an outbound gRPC long connection to the Control Plane, eliminating any public exposure risk.
- **⚡ High Concurrency**: Goroutine-based execution with connection pool reuse handles high-density HTTP-to-SQL workloads at low latency.
- **🔒 Data Stays Local**: Query instructions are dispatched by the Control Plane, but actual data flows only between the Gateway and the database — sensitive data never passes through the control layer.

---

## 🏗️ Technical Architecture

### Backend Stack (Control Plane & Gateway)
- **Core Framework**: Go 1.25+, Gin (HTTP API)
- **Communication**: gRPC Server/Client (HTTP/2 reverse long connection)
- **Control Database**: PostgreSQL (pgx driver)
- **Auth**: JWT-based token issuance and verification
- **Database Support**: MySQL, PostgreSQL, SQL Server, SQLite, StarRocks, Apache Doris (all drivers integrated)

### Frontend Stack (Admin & Web)
- **Framework**: Next.js 16 (App Router)
- **Language**: React 19 + TypeScript 5
- **Visuals**: Tailwind CSS 4 + Framer Motion
- **Package Management**: pnpm / npm

---

## 📁 Project Structure

```
owlapi/
├── backend/                        # 🛡️ Go Core Backend (Dual Engines)
│   ├── cmd/
│   │   ├── server/                 # Control Plane (main entry)
│   │   ├── gateway/                # Gateway (executor entry)
│   │   └── init/                   # Data seeding tool
│   ├── internal/
│   │   ├── domain/                 # Core domain models & interface definitions
│   │   ├── service/                # Business logic orchestration
│   │   ├── repo/postgres/          # Database access layer
│   │   ├── transport/              # External communication layer (Gin HTTP / gRPC)
│   │   └── gateway/                # ★ Gateway connection management & lifecycle
│   └── proto/                      # gRPC Protobuf definitions
│
├── frontend/
│   ├── admin/                      # 🎯 Admin Console (Next.js, port 8001)
│   ├── website/                    # 🌐 Official Website (Next.js, port 8002)
│   └── docs/                       # 📚 VitePress Documentation (port 8003)
│
├── deploy/                         # 🚀 Production Docker Compose configs
├── docker-compose.dev.yml          # One-click dev environment (6 services)
└── Makefile                        # Project management commands
```

### Core Directory Reference

| Directory | Responsibility | Tech |
|------|------|--------|
| `backend/cmd/server/` | Control Plane — tenant management, API orchestration, auth, and gateway dispatch | Go + Gin |
| `backend/cmd/gateway/` | Lightweight executor node in internal networks — receives SQL instructions via gRPC and runs them against the local database | Go + DB Drivers |
| `frontend/admin/` | Admin console covering tenant management, API orchestration, gateway configuration, and more | Next.js 16 |

---

## 🚀 Installation & Configuration

### Prerequisites

- **Docker** >= 20.10 & **Docker Compose** V2
- **Make**
- **Go** >= 1.25 (for local native development)
- **Node.js** >= 22 (for local frontend builds)

---

## ⚡ Quick Start (3 Minutes)

### 1. Clone the repository
```bash
git clone https://github.com/bulolo/owlapi.git
cd owlapi
```

### 2. Start the development environment

Runs all containers in the foreground with aggregated logs. Press Ctrl+C to stop:
```bash
make dev-up
```

Services will be available at:
- 🎯 **Admin Console**: http://localhost:8001 `(admin@owlapi.cn / admin123)`
- 📚 **Documentation**: http://localhost:8003
- 🚀 **RESTful API**: http://localhost:3000
- 🐘 **PostgreSQL**: localhost:5433

---

## 🏗️ Project Management (Makefile)

The root `Makefile` wraps common build, start, and cleanup operations into single commands, reducing day-to-day development overhead.

### Core Commands

| Command | Action |
|------|------|
| `make dev-up` | **Start all services** — launches all dev containers in the foreground with aggregated logs. Ctrl+C stops them but preserves data. |
| `make dev-down` | **Stop services** — stops and removes all containers while keeping volumes intact for the next run. |
| `make dev-clean` | **Full reset** — deletes all containers and volumes including `postgres_data`. Use to completely reset the dev environment. ⚠️ All data will be lost. |

---

## ❓ FAQ

> [!TIP]
> When something goes wrong with your environment, running `make dev-clean` followed by `make dev-up` resolves the vast majority of issues.

**Q: Seeing `Connection timeout / gRPC failed` when executing SQL?**
A: Check the Gateway container logs to confirm it can reach your internal database, and verify that the Control Plane address in its startup configuration is correct.

**Q: Want to add support for a new database?**
A: Add DSN recognition logic in the `resolveDriver` function inside `backend/internal/gateway/executor.go` and import the corresponding driver package.

---

## 📚 Documentation

- 📖 [Deployment Guide](./frontend/docs/docs/guide/architecture.md)
- 🚀 [Multi-tenancy & RBAC](./frontend/docs/docs/guide/multi-tenancy.md)
- 🔌 [REST API Reference](./frontend/docs/docs/api/rest.md)
- 🎯 [gRPC Tunnel Protocol](./frontend/docs/docs/api/grpc.md)

---

## 📄 License & Commercial Use

This project is licensed under the **OwlApi Open Source License (based on Apache 2.0)**. Additional terms are included to protect the project brand and commercial interests while keeping it open for personal and internal use.

### 📌 Core Principles
1. **Personal / Internal Use**: Completely free, no authorization required.
2. **Mandatory Branding**: You **must not** remove or modify the "OwlApi" branding in the UI, console, or API response headers under any circumstance.
3. **No Unauthorized SaaS**: Using this source code to provide commercial multi-tenant SaaS services (e.g., hosted API gateways, SQL-to-API subscription platforms) without official written authorization is strictly prohibited.

### ⚠️ Why these restrictions?
We want to contribute to the open-source community while preventing de-branded commercial exploitation. For commercial licensing inquiries or partnership opportunities, contact us at: [owlapi.cn](https://owlapi.cn).

See [LICENSE](LICENSE) for the full text.

### 🤔 Why this license model?
We drew inspiration from established open-source commercial licensing approaches, aiming to be more enterprise-friendly than AGPL-3.0 while using the multi-tenant SaaS restriction to protect the project's core assets and brand identity.

---

<div align="center">

## 📮 Contact

**💬 Issues**: [GitHub Issues](https://github.com/bulolo/owlapi/issues) &nbsp; | &nbsp; **📧 Business**: support@owlapi.cn / bulolo (WeChat) &nbsp; | &nbsp; **🌐 Website**: [owlapi.cn](https://owlapi.cn)

<br>

<img src="./frontend/docs/docs/public/images/wechat.jpg" width="160" alt="WeChat QR Code">
<br>
<sub>Scan to join the community (Note: OwlApi)</sub>

</div>

</div>

---

<div align="center">

**⭐ If this project is helpful, please give us a Star!**

Made with ❤️ by OwlApi Team

</div>
