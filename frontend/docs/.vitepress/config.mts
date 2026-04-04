import { defineConfig } from 'vitepress'

export default defineConfig({
  srcDir: 'docs',
  title: 'OwlApi',
  description: '企业级 SQL to API 智能网关平台',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/introduction' },
      { text: 'API 参考', link: '/api/protocol' },
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
            { text: '多租户设计', link: '/guide/multi-tenancy' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '接口协议', link: '/api/protocol' },
            { text: '错误码', link: '/api/errors' },
            { text: '环境变量', link: '/api/config' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/bulolo/owlapi' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © OwlApi',
    },
  },
})
