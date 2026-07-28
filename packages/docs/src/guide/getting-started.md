# Getting Started

Welcome to **Phantom Fleet Manager** — the intelligent Discord bot fleet commander built for developers who run bot armies.

## What is Phantom Fleet Manager?

Phantom Fleet Manager is a production-grade, self-hosted control center for managing multiple Discord bots across hundreds of servers. It goes beyond simple process management to provide:

- **Fleet Intelligence** — Knowledge graph of your entire fleet (token collisions, permission gaps, health scores, attack surface)
- **Zero-Downtime Token Rotation** — Hot-swap tokens via IPC without stopping bots
- **Message Time-Travel Debugger** — Scrubbable timeline with bot decision traces per message
- **Bot Forge** — Visual bot generator → production-ready TypeScript project (Docker, CI, tests, docs)
- **Fleet Templates** — Infrastructure-as-Code for bots (YAML with inheritance, mixins, variables)
- **Plugin SDK** — Extend with custom features via `@discord-fleet-manager/sdk`

## Why Phantom Fleet?

| Scenario | Traditional Approach | Phantom Fleet |
|----------|---------------------|---------------|
| **Rotate 20 bot tokens** | Stop each → edit `.env` → restart → verify | `phantom-fleet token:rotate --all` (hot-swap, zero downtime) |
| **Debug "why did bot reply that?"** | `console.log` archaeology | Message replay with decision trace per feature |
| **New moderation bot for 50 servers** | Copy config, hope nothing breaks | `phantom-fleet template:generate -t moderation-bot -n ModBot --apply-fleet` |
| **Audit permissions** | Manual check per bot per server | `phantom-fleet intel:gaps` → shows every missing permission |
| **Team collaboration** | Share `.env` files, pray | Built-in RBAC, audit log, approval workflows |

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm 10+** (or pnpm/yarn)
- **Git** (for fleet templates)
- **Discord Bot Tokens** (from [Discord Developer Portal](https://discord.com/developers/applications))

## Quick Start (60 seconds)

```bash
# 1. Clone & install
git clone https://github.com/phantom1785322-hub/Phantom-Fleet
cd Phantom-Fleet
npm install

# 2. Setup (generates FLEET_SECRET, creates DB, seeds templates)
npm run setup

# 3. Start dashboard
npm start
# → Dashboard at http://localhost:3000
```

## Next Steps

- [Installation](/guide/installation) — Detailed install for Linux, macOS, Windows, Docker, VPS
- [Quick Start](/guide/quick-start) — Add your first bot, start monitoring
- [Configuration](/guide/configuration) — Environment variables, config file, secrets
- [Architecture](/guide/architecture) — How the fleet manager works internally