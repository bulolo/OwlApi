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

**If this project helps you, please give us a ⭐ Star! It's the best encouragement for developers!**

</div>

---

## 🚀 Recent Updates

### 2026-05-13 🗄️ Full Multi-Database Support
- 🔌 **Six Database Types**: Added full support for MySQL, PostgreSQL, SQL Server, SQLite, StarRocks, and Apache Doris — all drivers integrated, ready out of the box.
- 🖥️ **Data Browser**: Visually browse remote database table schemas and preview table data without any external tools.
- 📋 **Structured Connection Form**: Datasource setup no longer requires hand-writing DSNs — fill in Host, Port, Username, Password, and Database as separate fields.

### 2026-04-01 🌐 Gateway Executor Evolution
- 🛡️ **Hybrid Cloud Architecture**: Released a major architectural update. Gateway can now operate inside deep internal networks, establishing gRPC reverse tunnel communication, eliminating the need for public IPs and complex firewall rules.
- ⚙️ **Multi-tenancy Isolation**: Launched the RBAC system (SuperAdmin / Admin / Viewer) with strict permission isolation across data sources and projects.
- 📦 **Parameter Inference**: Supports dynamic detection of `:variables` in SQL, automatically mapping them to HTTP Query or Body parameters.
- 📚 **Website Upgrade**: [owlapi.cn](https://owlapi.cn) fully redesigned with an enterprise-grade UI.

---

## 💡 Use Cases

| Scenario | Description |
|------|------|
| 🏢 **Internal Data Exposure** | Safely expose databases behind ERP, MES, or WMS systems as standard REST APIs for frontend or third-party consumption — no changes to existing systems required. |
| 📊 **Reporting & Query APIs** | Business and data teams write SQL to generate query APIs directly, removing backend dependency and delivering data in minutes. |
| 🔗 **Cross-system Data Integration** | Unify heterogeneous databases (MySQL, SQL Server, PostgreSQL, etc.) under a single API layer, hiding the complexity of different backends. |
| 🚀 **Rapid Prototyping & MVP** | Skip backend development entirely — generate CRUD APIs from an existing database to validate ideas fast. |
| 🛡️ **Database Access Gateway** | Replace direct DB connections with an API gateway for unified auth, parameter validation, and access auditing — no more exposing database credentials to applications. |

---

## 🎯 Project Highlights

- ✅ **Out-of-the-Box**: `make dev-up` launches the full stack (Control Plane + Gateway + Database + Admin Console + Docs, 6 containers) in one command.
- ✅ **Physical Decoupling**: Control Plane and Gateway run as separate processes, ensuring the control layer and data execution layer are independently secured.
- ✅ **Full Database Compatibility**: Native support for MySQL, PostgreSQL, SQL Server, SQLite, StarRocks, and Apache Doris — six database types, all drivers integrated.
- ✅ **Edge-Ready**: Built with Go 1.25, single-binary packaging and minimal memory footprint make it deployable on Raspberry Pi or embedded devices.
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
- **👥 RBAC Permission System**: Strict role management across SuperAdmin, Admin, and Viewer levels.
- **🌐 Project Isolation**: Organize APIs into Projects by function or business domain, ensuring complete endpoint isolation.

### 🌐 Gateway (Executor)
- **🚀 Zero-Intrusion Deployment**: No firewall ports needed for databases. The Gateway initiates an outbound gRPC long connection to the Control Plane, eliminating public exposure risk.
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
│   │   ├── domain/                 # Core domain models & contracts
│   │   ├── service/                # Business logic orchestration
│   │   ├── repo/postgres/          # DB repository implementation
│   │   ├── transport/              # Communication layer (Gin / gRPC)
│   │   └── gateway/                # ★ Gateway engine & lifecycle
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
| `backend/cmd/gateway/` | Lightweight executor in internal networks, runs SQL payloads received via gRPC | Go + DB Drivers |
| `frontend/admin/` | Engineer console for managing the full multi-tenant lifecycle | Next.js 16 |

---

## 🚀 Installation & Configuration

### Prerequisites

- **Docker** >= 20.10 & **Docker Compose** V2
- **Make**
- **Go** >= 1.25+ (for local development)
- **Node.js** >= 22 (for frontend builds)

---

## ⚡ Quick Start (3 Minutes)

### 1. Clone the repository
```bash
git clone https://github.com/bulolo/owlapi.git
cd owlapi
```

### 2. Start the development environment

Supports hot-reload and real-time logs:
```bash
make dev-up
```

Services will be available at:
- 🎯 **Admin Console**: http://localhost:8001 `(admin@owlapi.cn / admin123)`
- 📚 **Documentation**: http://localhost:8003
- 🌐 **RESTful API**: http://localhost:3000
- 🐘 **PostgreSQL**: localhost:5433

---

## 🏗️ Project Management (Makefile)

The root `Makefile` abstracts complex operations into simple commands.

### Core Commands

| Command | Action |
|------|------|
| `make dev-up` | **Start all services** in foreground via docker-compose.dev. Data is preserved on Ctrl+C. |
| `make dev-down` | **Stop services** without destroying volumes or database state. |
| `make dev-clean` | **Deep clean**: destroys all volumes including `postgres_data`. ⚠️ Data is unrecoverable. |

---

## ❓ FAQ

> [!TIP]
> **Troubleshooting**: When facing environment or dependency issues, `make dev-clean` followed by `make dev-up` resolves 99.9% of problems.

**Q: Seeing `Connection timeout / gRPC failed` when executing SQL?**
A: Check Gateway logs to confirm it can reach your internal database and that the Control Plane IP is correctly set in its environment variables.

**Q: Want to add support for a new database?**
A: Add DSN recognition logic in `resolveDriver` inside `backend/internal/gateway/executor.go` and import the corresponding driver package.

---

## 📚 Documentation

- 📖 [Architecture Guide](./frontend/docs/docs/guide/architecture.md)
- 🚀 [RBAC & Multi-tenancy](./frontend/docs/docs/guide/multi-tenancy.md)
- 🔌 [REST API Reference](./frontend/docs/docs/api/rest.md)
- 🎯 [gRPC Tunnel Protocol](./frontend/docs/docs/api/grpc.md)

---

## 📄 License & Commercial Use

This project is licensed under the **OwlApi Open Source License (based on Apache 2.0)**. Additional terms are included to protect the project brand and commercial interests.

### 📌 Core Principles
1. **Personal / Internal Use**: Completely free, no authorization required.
2. **Mandatory Branding**: You **must not** remove or modify "OwlApi" branding in the UI, console, or API response headers under any circumstance.
3. **No Unauthorized SaaS**: Using this source code to provide commercial multi-tenant SaaS services (e.g., hosted API gateways, SQL-to-API platforms) without official written authorization is strictly prohibited.

### ⚠️ Why these restrictions?
We want to contribute to the open-source community while preventing de-branded commercial exploitation. For commercial licensing inquiries, contact: [owlapi.cn](https://owlapi.cn).

See [LICENSE](LICENSE) for the full text.

---

<div align="center">

## 📮 Contact

**💬 Issues**: [GitHub Issues](https://github.com/bulolo/owlapi/issues) &nbsp; | &nbsp; **📧 Business**: support@owlapi.cn / bulolo (WeChat) &nbsp; | &nbsp; **🌐 Website**: [owlapi.cn](https://owlapi.cn)

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
