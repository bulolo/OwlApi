---
layout: home

hero:
  name: "OwlApi"
  text: "一条 SQL 生成 REST API"
  tagline: 将参数化 SQL 发布为可鉴权、可审计的 HTTP 接口；数据库留在内网，由 Gateway 执行并返回 JSON。
  image:
    src: /logo.svg
    alt: OwlApi
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 在线试用
      link: https://admin.owlapi.cn
    - theme: alt
      text: GitHub
      link: https://github.com/bulolo/owlapi

features:
  - icon:
      src: /icons/code.svg
    title: SQL 直接变接口
    details: 编写参数化 SQL，配置路径和方法，自动推断 Query / Body / Path 参数，即可生成可调用的 REST API。

  - icon:
      src: /icons/network.svg
    title: 内网 Gateway 零侵入
    details: Gateway 主动向 Control Plane 发起 gRPC 反向长连接，无需开放数据库防火墙端口，数据库永不暴露公网。

  - icon:
      src: /icons/database.svg
    title: 六类数据库开箱即用
    details: 原生支持 MySQL、PostgreSQL、SQL Server、SQLite、StarRocks、Apache Doris，驱动均已集成。

  - icon:
      src: /icons/lock.svg
    title: 鉴权与审计前置
    details: 在 SQL 执行前统一完成 API Key、JWT 校验及 RBAC 权限拦截，操作日志全链路可查。

  - icon:
      src: /icons/users.svg
    title: 多租户严格隔离
    details: 内置 SuperAdmin / Admin / Viewer 三级角色体系，按组织、项目和数据源维度隔离，多团队协作不越权。

  - icon:
      src: /icons/rocket.svg
    title: 一键拉起全栈环境
    details: make dev-up 在本地启动完整的六服务容器，3 分钟内可发布第一个 SQL API。
---

<script setup>
import { ref, onMounted } from 'vue'

const links = ref({
  admin: 'https://admin.owlapi.cn',
  docs: 'https://docs.owlapi.cn',
  website: 'https://owlapi.cn'
})

onMounted(() => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    links.value = {
      admin: 'http://localhost:8001',
      docs: 'http://localhost:8003',
      website: 'http://localhost:8002'
    }
  }
})
</script>

<div class="home-content">

## 快速启动

<div class="code-block-wrapper">

::: code-group

```bash [🛠️ 开发环境]
git clone https://github.com/bulolo/owlapi.git
cd owlapi

# 启动全栈开发环境（热重载）
make dev-up
```

```bash [🚀 生产部署]
git clone https://github.com/bulolo/owlapi.git
cd owlapi

# 启动生产环境
make prod-up
```

:::

</div>

<div class="service-grid">
  <a :href="links.admin" class="service-item" target="_blank">
    <div class="icon-box">
      <svg class="service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>
    </div>
    <div class="service-info">
      <strong>管理后台</strong>
      <span>{{ links.admin.replace('https://', '').replace('http://', '') }}</span>
    </div>
  </a>
  <a :href="links.website" class="service-item" target="_blank">
    <div class="icon-box">
      <svg class="service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
    </div>
    <div class="service-info">
      <strong>官方网站</strong>
      <span>{{ links.website.replace('https://', '').replace('http://', '') }}</span>
    </div>
  </a>
  <a :href="links.docs" class="service-item" target="_blank">
    <div class="icon-box">
      <svg class="service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>
    </div>
    <div class="service-info">
      <strong>技术文档</strong>
      <span>{{ links.docs.replace('https://', '').replace('http://', '') }}</span>
    </div>
  </a>
</div>

## 界面预览

<div class="screenshot-grid">
  <figure>
    <div class="img-wrapper">
      <img src="/images/1.png" alt="Dashboard 概览">
    </div>
    <figcaption>Dashboard 概览</figcaption>
  </figure>
  <figure>
    <div class="img-wrapper">
      <img src="/images/2.png" alt="API 编排">
    </div>
    <figcaption>API 编排</figcaption>
  </figure>
</div>

## 技术栈

<div class="tech-grid">
  <div class="tech-group">
    <div class="tech-header">
      <div class="tech-icon-box">
        <svg class="tech-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
      </div>
      <h4>后端服务</h4>
    </div>
    <div class="tags">
      <span>Go 1.25+</span><span>Gin</span><span>gRPC</span><span>PostgreSQL</span><span>JWT</span>
    </div>
  </div>
  <div class="tech-group">
    <div class="tech-header">
      <div class="tech-icon-box">
        <svg class="tech-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
      </div>
      <h4>前端应用</h4>
    </div>
    <div class="tags">
      <span>Next.js 16</span><span>React 19</span><span>TypeScript</span><span>Tailwind CSS 4</span>
    </div>
  </div>
  <div class="tech-group">
    <div class="tech-header">
      <div class="tech-icon-box">
        <svg class="tech-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
      </div>
      <h4>数据库支持</h4>
    </div>
    <div class="tags">
      <span>MySQL</span><span>PostgreSQL</span><span>SQL Server</span><span>SQLite</span><span>StarRocks</span><span>Doris</span>
    </div>
  </div>
</div>

</div>

<style>
.home-content {
  max-width: 1152px;
  margin: 0 auto;
  padding: 2rem 24px 2rem;
}

.home-content h2 {
  margin-top: 2.5rem;
  margin-bottom: 1.25rem;
  font-size: 1.5rem;
  font-weight: 600;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.5rem;
  color: var(--vp-c-text-1);
  line-height: 1.4;
}

.code-block-wrapper {
  margin-bottom: 1.5rem;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.service-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid transparent;
  border-radius: 12px;
  text-decoration: none !important;
  transition: all 0.2s ease;
}

.service-item:hover {
  transform: translateY(-2px);
  background: var(--vp-c-bg-elv);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--vp-c-brand-soft);
  border-radius: 8px;
  margin-right: 0.75rem;
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

.service-icon {
  width: 20px;
  height: 20px;
}

.service-info {
  display: flex;
  flex-direction: column;
}

.service-info strong {
  color: var(--vp-c-text-1);
  font-size: 0.95rem;
  font-weight: 600;
}

.service-info span {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
}

.screenshot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.img-wrapper {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: 1px solid var(--vp-c-divider);
  transition: border-color 0.3s ease;
  background: var(--vp-c-bg-soft);
}

.img-wrapper:hover {
  border-color: var(--vp-c-brand-1);
}

.screenshot-grid img {
  width: 100%;
  height: auto;
  display: block;
}

.screenshot-grid figcaption {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  text-align: center;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem 0;
  border-bottom: 1px dashed var(--vp-c-divider);
}

.tech-group {
  padding: 0.25rem;
}

.tech-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.tech-icon-box {
  width: 32px;
  height: 32px;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-1);
}

.tech-icon {
  width: 16px;
  height: 16px;
}

.tech-group h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tags span {
  font-size: 0.75rem;
  padding: 0.25rem 0.6rem;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.tags span:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

@media (max-width: 640px) {
  .home-content {
    padding: 1.5rem 1rem 3rem;
  }

  .home-content h2 {
    font-size: 1.35rem;
    margin-top: 2rem;
  }

  .screenshot-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
