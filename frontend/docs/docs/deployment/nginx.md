# Nginx 反向代理配置

本文提供将 OwlApi 各服务通过 Nginx 以 HTTPS 域名对外暴露的完整配置。

## 域名规划

推荐将以下子域名分别指向各服务：

| 子域名 | 指向端口 | 说明 |
| :--- | :--- | :--- |
| `api.yourdomain.com` | `:3000` | Control Plane REST API |
| `admin.yourdomain.com` | `:8001` | Admin 管理控制台 |
| `docs.yourdomain.com` | `:8003` | 文档站点 |
| `www.yourdomain.com` | `:8004` | 官方网站（可选） |

## SSL 证书

推荐使用通配符证书（`*.yourdomain.com`），统一放在 `/etc/nginx/ssl/` 目录：

```bash
/etc/nginx/ssl/
├── yourdomain.pem   # 证书文件
└── yourdomain.key   # 私钥文件
```

可使用 Let's Encrypt / acme.sh 或阿里云、腾讯云等云厂商申请。

---

## 完整配置文件

将以下内容保存为 `/etc/nginx/conf.d/owlapi.conf`，替换 `yourdomain.com` 和证书路径：

```nginx
# ==============================================================================
# OwlApi Nginx 反向代理配置
# ==============================================================================

# 通用代理头（所有 server 块继承）
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Port  $server_port;

# 安全响应头
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options          "SAMEORIGIN"                           always;
add_header X-Content-Type-Options   "nosniff"                              always;
add_header Referrer-Policy          "strict-origin-when-cross-origin"      always;

# Gzip 压缩
gzip            on;
gzip_proxied    any;
gzip_comp_level 6;
gzip_types      text/plain text/css application/json application/javascript
                text/xml application/xml application/xml+rss text/javascript;

# HTTP → HTTPS 强制跳转
server {
    listen      80;
    server_name yourdomain.com www.yourdomain.com admin.yourdomain.com
                api.yourdomain.com docs.yourdomain.com;

    return 301 https://$host$request_uri;
}

# Admin 管理控制台
server {
    listen      443 ssl;
    server_name admin.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/yourdomain.pem;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8001;
    }
}

# Backend API（关闭缓冲以支持长连接）
server {
    listen      443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/yourdomain.pem;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    proxy_buffering    off;

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}

# 文档站点
server {
    listen      443 ssl;
    server_name docs.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/yourdomain.pem;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8003;
    }
}

# 官方网站（可选）
server {
    listen      443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/yourdomain.pem;
    ssl_certificate_key /etc/nginx/ssl/yourdomain.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8004;
    }
}
```

---

## 验证与重载

```bash
# 测试配置语法
nginx -t

# 重载配置（不重启）
nginx -s reload
```

---

## 常见问题

**Q: API 接口请求超时？**

`api.yourdomain.com` 的 `proxy_read_timeout` 已设置为 300s，如果你的 SQL 查询执行时间更长，请相应增大该值。同时检查 `OWLAPI_QUERY_TIMEOUT_SECONDS` 环境变量。

**Q: Admin 页面刷新 404？**

Next.js App Router 的客户端路由在 Nginx 默认配置下可能出现 404。如有问题，可在 Admin 的 `location` 块添加：

```nginx
location / {
    proxy_pass http://127.0.0.1:8001;
    proxy_intercept_errors off;
}
```
