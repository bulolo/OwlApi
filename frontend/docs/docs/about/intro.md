# 项目介绍

<div align="center">

<img src="/logo.svg" width="100" alt="OwlApi Logo" style="margin: 1rem 0">

# OwlApi

**企业级 SQL to API 智能网关平台**

编写 SQL 即可一键生成高可用 RESTful API，数据库永不暴露公网，数据流转全程在内网完成。

</div>

---

## ✨ 核心特性

### 🎯 管理后台（Control Plane）
- **📝 SQL 直接变接口** — 编写参数化 SQL，配置路径和 HTTP 方法，自动推断 Query / Body / Path 参数，即可生成可调用的 REST API
- **👥 RBAC 权限管理** — 内置 SuperAdmin / Admin / Viewer 三级角色体系，精细管控每个租户的资源访问范围
- **🌐 项目隔离** — 按业务职能划分 Project，各项目的 API 端点与认证凭据完全独立，互不干扰
- **📦 版本管理** — 接口支持多版本发布与一键回滚，已发布版本使用快照执行，草稿编辑不影响线上
- **📜 JS 脚本扩展** — 支持前置脚本（修改入参）和后置脚本（转换响应），在 Goja 引擎中执行

### 🌐 网关执行器（Gateway）
- **🚀 零侵入部署** — Gateway 主动向 Control Plane 建立 gRPC 反向隧道，无需开放数据库防火墙端口
- **⚡ 高并发承载** — 基于 Go 协程与连接池复用，支持高密度 HTTP-to-SQL 并发转换，低延迟响应
- **🔒 数据不过控制面** — 查询指令由 Control Plane 下发，实际数据仅在 Gateway 与数据库之间流转，敏感数据不经中转
- **🖥️ 边缘就绪** — 单一二进制、内存占用极低，可稳定运行在树莓派、NAS 或软路由等边缘设备上

---

## 📸 应用截图

<table>
  <tbody>
  <tr>
    <td width="50%">
      <img src="/images/1.png" alt="Dashboard 概览">
      <p align="center"><b>Dashboard 概览</b></p>
    </td>
    <td width="50%">
      <img src="/images/2.png" alt="API 编排">
      <p align="center"><b>API 编排</b></p>
    </td>
  </tr>
  </tbody>
</table>

---

## 🏗️ 技术栈

### 后端（Control Plane & Gateway）

| 技术 | 说明 |
| :--- | :--- |
| Go 1.25+ | 核心运行时，编译为单一二进制 |
| Gin | HTTP API 框架 |
| gRPC / Protobuf | Control Plane ↔ Gateway 双向流通信 |
| PostgreSQL + pgx | 控制面数据存储 |
| JWT | 用户认证与授权 |
| Goja | JavaScript 脚本执行引擎（前置/后置脚本） |

### 前端（Admin & Docs）

| 技术 | 说明 |
| :--- | :--- |
| Next.js 16 | 管理控制台（App Router） |
| React 19 + TypeScript 5 | 前端语言与框架 |
| Tailwind CSS 4 | 样式方案 |
| VitePress | 文档站点（本站） |

### 数据库驱动支持

| 数据库 | 驱动 |
| :--- | :--- |
| MySQL | `go-sql-driver/mysql` |
| PostgreSQL | `lib/pq` |
| SQL Server | `microsoft/go-mssqldb` |
| SQLite | `mattn/go-sqlite3` |
| StarRocks | `go-sql-driver/mysql`（兼容协议） |
| Apache Doris | `go-sql-driver/mysql`（兼容协议） |

---

## 🏢 典型使用场景

| 场景 | 描述 |
| :--- | :--- |
| 企业内网数据开放 | 将 ERP、MES、WMS 等内网数据库通过网关安全暴露为 REST API，无需改造原有系统 |
| 报表与数据查询 API | 运营、数据团队直接编写 SQL 生成接口，不依赖后端排期，分钟级交付数据需求 |
| 跨系统数据集成 | 多套异构数据库统一接入，通过 API 层屏蔽底层差异，简化集成复杂度 |
| 快速原型与 MVP | 跳过后端开发，基于现有数据库直接生成 CRUD 接口，快速验证业务想法 |
| 数据库访问收口 | 以 API 网关替代直连数据库，统一鉴权与访问审计，避免业务系统暴露数据库凭证 |

---

<div align="center">

**⭐ 如果这个项目对你有帮助，欢迎给我们一个 Star！**

Made with ❤️ by OwlApi Team

</div>
