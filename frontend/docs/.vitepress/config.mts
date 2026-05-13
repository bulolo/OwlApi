import { defineConfig } from 'vitepress'

export default defineConfig({
  srcDir: 'docs',
  ignoreDeadLinks: true,
  title: 'OwlApi',
  description: '企业级 SQL to API 智能网关平台',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/introduction' },
      { text: 'API 参考', link: '/api/rest' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '简介', link: '/guide/introduction' },
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
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/bulolo/owlapi' },
    ],

    footer: {
      message: 'Released under the OwlApi Open Source License (Apache 2.0 with additional commercial restrictions).',
      copyright: 'Copyright © OwlApi',
    },
  },
})
