import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Phantom Fleet Manager',
  description: 'Intelligent Discord bot fleet manager - Command your legion. Own the night.',
  base: '/Discord-Fleet-Manager/',
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#00d4aa' }],
    ['meta', { property: 'og:title', content: 'Phantom Fleet Manager' }],
    ['meta', { property: 'og:description', content: 'Intelligent Discord bot fleet manager' }],
    ['meta', { property: 'og:image', content: '/og-image.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
  ],
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'API Reference', link: '/api/bots', activeMatch: '/api/' },
      { text: 'CLI Reference', link: '/cli/overview', activeMatch: '/cli/' },
      { text: 'Intelligence', link: '/intelligence/overview', activeMatch: '/intelligence/' },
      { text: 'Plugins', link: '/plugins/overview', activeMatch: '/plugins/' },
      { text: 'GitHub', link: 'https://github.com/phantom1785322-hub/Phantom-Fleet' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Configuration', link: '/guide/configuration' },
            { text: 'Docker', link: '/guide/docker' },
            { text: 'VPS Deploy', link: '/guide/vps-deploy' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Fleet Architecture', link: '/guide/architecture' },
            { text: 'Bots & Features', link: '/guide/bots-features' },
            { text: 'Message Monitoring', link: '/guide/monitoring' },
            { text: 'Token Management', link: '/guide/token-management' },
            { text: 'Import/Export', link: '/guide/import-export' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Fleet Intelligence', link: '/guide/intelligence' },
            { text: 'Token Rotation', link: '/guide/token-rotation' },
            { text: 'Message Time-Travel', link: '/guide/message-time-travel' },
            { text: 'Bot Forge', link: '/guide/bot-forge' },
            { text: 'Fleet Templates', link: '/guide/fleet-templates' },
            { text: 'RBAC & Audit', link: '/guide/rbac' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'REST API',
          items: [
            { text: 'Overview', link: '/api/overview' },
            { text: 'Authentication', link: '/api/auth' },
            { text: 'Bots', link: '/api/bots' },
            { text: 'Monitoring', link: '/api/monitoring' },
            { text: 'Intelligence', link: '/api/intelligence' },
            { text: 'Token Engines', link: '/api/token-engines' },
            { text: 'Status Engine', link: '/api/status-engine' },
            { text: 'Import/Export', link: '/api/import-export' },
            { text: 'WebSocket', link: '/api/websocket' }
          ]
        }
      ],
      '/cli/': [
        {
          text: 'CLI Reference',
          items: [
            { text: 'Overview', link: '/cli/overview' },
            { text: 'Setup & Doctor', link: '/cli/setup-doctor' },
            { text: 'Bots Commands', link: '/cli/bots' },
            { text: 'Features Commands', link: '/cli/features' },
            { text: 'Monitoring Commands', link: '/cli/monitoring' },
            { text: 'Token Commands', link: '/cli/tokens' },
            { text: 'Intelligence Commands', link: '/cli/intelligence' },
            { text: 'Message Commands', link: '/cli/messages' },
            { text: 'Templates Commands', link: '/cli/templates' },
            { text: 'Config Commands', link: '/cli/config' }
          ]
        }
      ],
      '/intelligence/': [
        {
          text: 'Fleet Intelligence',
          items: [
            { text: 'Overview', link: '/intelligence/overview' },
            { text: 'Knowledge Graph', link: '/intelligence/knowledge-graph' },
            { text: 'Health Scoring', link: '/intelligence/health-scoring' },
            { text: 'Token Collisions', link: '/intelligence/token-collisions' },
            { text: 'Permission Gaps', link: '/intelligence/permission-gaps' },
            { text: 'Attack Surface', link: '/intelligence/attack-surface' },
            { text: 'Cost Estimation', link: '/intelligence/cost-estimation' }
          ]
        }
      ],
      '/plugins/': [
        {
          text: 'Plugin System',
          items: [
            { text: 'Overview', link: '/plugins/overview' },
            { text: 'Creating Plugins', link: '/plugins/creating' },
            { text: 'SDK Reference', link: '/plugins/sdk' },
            { text: 'Publishing', link: '/plugins/publishing' },
            { text: 'Examples', link: '/plugins/examples' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/phantom1785322-hub/Phantom-Fleet' },
      { icon: 'discord', link: 'https://discord.gg/phantom-fleet' },
      { icon: 'twitter', link: 'https://twitter.com/PhantomFleetMgr' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Phantom'
    },
    search: {
      provider: 'local'
    },
    editLink: {
      pattern: 'https://github.com/phantom1785322-hub/Phantom-Fleet/edit/main/docs/src/:path',
      text: 'Edit this page on GitHub'
    },
    lastUpdated: true
  },
  markdown: {
    theme: 'github-dark',
    lineNumbers: true
  }
})