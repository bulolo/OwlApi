import { defineConfig } from 'vitepress'
import pkg from '../package.json' with { type: 'json' }

export default defineConfig({
  srcDir: 'docs',
  ignoreDeadLinks: [
    /^http:\/\/localhost/,
    /^\.\.?\//,
  ],
  title: 'OwlApi 文档',
  description: '企业级 SQL to API 智能网关平台 - 完整文档',
  lang: 'zh-CN',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: '开发指南', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: '部署指南', link: '/deployment/docker', activeMatch: '/deployment/' },
      { text: 'API 参考', link: '/api/rest', activeMatch: '/api/' },
      { text: '关于', link: '/about/intro', activeMatch: '/about/' },
      {
        text: `v${pkg.version}`,
        link: `https://github.com/bulolo/owlapi/releases/tag/v${pkg.version}`
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '项目简介', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/quick-start' },
          ],
        },
        {
          text: '深入',
          items: [
            { text: '系统架构', link: '/guide/architecture' },
            { text: '多租户与权限', link: '/guide/multi-tenancy' },
            { text: '代码生成', link: '/guide/codegen' },
          ],
        },
      ],

      '/deployment/': [
        {
          text: '部署指南',
          items: [
            { text: 'Docker 生产部署', link: '/deployment/docker' },
            { text: 'Nginx 反向代理', link: '/deployment/nginx' },
            { text: '独立 Gateway 部署', link: '/deployment/gateway' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: 'REST API', link: '/api/rest' },
            { text: 'gRPC 协议', link: '/api/grpc' },
            { text: '环境变量', link: '/api/config' },
          ],
        },
      ],

      '/about/': [
        {
          text: '关于项目',
          items: [
            { text: '项目介绍', link: '/about/intro' },
            { text: '更新日志', link: '/about/changelog' },
          ],
        },
        {
          text: '关于我们',
          items: [
            { text: '联系方式', link: '/about/contact' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/bulolo/owlapi' },
    ],

    footer: {
      message: 'Released under the <a href="https://github.com/bulolo/owlapi/blob/master/LICENSE">OwlApi Open Source License</a>.',
      copyright: 'Copyright © 2026 <a href="https://owlapi.cn" target="_blank">OwlApi Team</a>',
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: '本页目录',
    },
  },
})
