# Discord Fleet Manager — Master Improvement Plan
## From Archived Zero-Star Repo to Category-King Discord Fleet Tool

---

## 🎯 Executive Summary

**Current State**: Archived repo, 0 stars, empty description, zip-file-only codebase, no README on GitHub, no CI/CD, no community.

**Target State**: The definitive Discord bot fleet manager — polished, extensible, community-driven, with unique features no competitor has. 10k+ stars, active Discord community, sustainable contributor funnel.

**Differentiation Strategy**: Don't compete on "bot management" (everyone does that). Compete on **developer experience**, **intelligent automation**, **fleet intelligence**, and **extensibility as a first-class citizen**.

---

## 📝 Phase 0: Foundation (Week 1) — "Make It Real on GitHub"

### 0.1 Repository Hygiene
- [ ] Extract zip contents to repo root (delete zip)
- [ ] Add proper `.gitignore` (node_modules, *.log, fleet.db, .env, dist/)
- [ ] Add `LICENSE` (MIT — permissive, encourages adoption)
- [ ] Add `CODE_OF_CONDUCT.md` (Contributor Covenant)
- [ ] Add `CONTRIBUTING.md` with clear PR flow, commit conventions, testing requirements
- [ ] Add `SECURITY.md` with responsible disclosure email
- [ ] Add `SUPPORT.md` with links to Discord, GitHub Discussions, sponsorship

### 0.2 GitHub Metadata
- [ ] **Description** (160 chars max for search):
  > "Intelligent Discord bot fleet manager: multi-bot dashboard, real-time message intelligence, smart token/status engines, fleet portability. Built for developers who run bot armies."
- [ ] **Topics** (max 20, SEO-critical):
  `discord-bot`, `discord-js`, `bot-management`, `fleet-manager`, `dashboard`, `message-logger`, `token-management`, `fleet-portability`, `sqlite`, `express`, `websocket`, `typescript-ready`, `plugin-system`, `devops`, `automation`, `multi-bot`, `real-time-monitoring`
- [ ] **Website URL**: Point to deployed demo dashboard (or GitHub Pages docs site)
- [ ] **Social preview image**: 1280x640 branded OG image (Phantom banner style)

### 0.3 README.md — The Landing Page
Structure:
```
# Discord Fleet Manager 🚀
[Badges: stars, forks, license, node version, discord, build status]

> "The command center for your bot army." — Built by developers who run 50+ bots in production.

## Why This Exists
[Human story: managing 10+ bots manually sucks. Token rotation is scary. Status editing breaks code. Message debugging is blind. Fleet migration is impossible. We fixed all of it.]

## ✨ Killer Features (The "Why Switch" List)
[Feature cards with screenshots/GIFs — see Phase 1]

## 🚀 60-Second Start
[Copy-paste commands, Docker one-liner, VPS deploy script]

## 📸 Dashboard Preview
[Animated GIF or embedded video]

## 🏗 Architecture
[Mermaid diagram: dashboard ←ws→ API ←→ bots + monitors + engines]

## 🧩 Plugin System
[Show 3-line plugin example]

## 🤝 Community & Support
[Discord invite, GitHub Discussions, sponsor links]

## 📄 License
MIT — use it commercially, fork it, sell it, we don't care.
```

### 0.4 CI/CD Pipeline (GitHub Actions)
- [ ] `ci.yml`: lint (eslint), typecheck (tsc --noEmit), test (vitest), build
- [ ] `release.yml`: semantic-release on main, auto-changelog, Docker image to GHCR
- [ ] `docker.yml`: multi-arch build (amd64/arm64), push on tag
- [ ] `dependabot.yml`: weekly npm updates, auto-merge patch/minor with passing tests
- [ ] `codeql.yml`: security scanning
- [ ] `pages.yml`: deploy docs to GitHub Pages

---

## 🧠 Phase 1: Unique Value Props (Weeks 2-4) — "Features No One Else Has"

### 1.1 Fleet Intelligence Engine (The Crown Jewel)
**Problem**: You have 20 bots across 50 servers. Which bot is in which server? What permissions does it have? Which bots share tokens? Where are the security gaps?

**Solution**: `FleetIntelligence` — a background analyzer that builds a knowledge graph of your entire fleet.

```typescript
// Fleet Intelligence Capabilities
interface FleetIntelligence {
  // Cross-bot token collision detection
  findTokenCollisions(): TokenCollision[]; // "Bot A and Bot C share the same token!"
  
  // Permission gap analysis
  analyzePermissionGaps(): PermissionGap[]; // "Bot B lacks ManageMessages in #mod-log"
  
  // Fleet health scoring
  calculateHealthScore(): FleetHealth; // 0-100 with breakdown
  
  // Cost optimization
  estimateMonthlyCost(): CostBreakdown; // API calls, shards, VPS sizing
  
  // Attack surface mapping
  mapAttackSurface(): AttackSurface; // Exposed tokens, over-permissioned bots, public dashboards
  
  // Drift detection
  detectConfigDrift(): ConfigDrift[]; // "Bot D's welcome config differs from fleet template"
}
```

**UI**: Interactive graph view (Cytoscape.js) — nodes = bots/guilds, edges = membership. Click node → see permissions, token status, health.

**Why it kills competition**: Nobody else treats the fleet as a *system* to be analyzed. They treat it as a list.

---

### 1.2 Smart Token Rotator with Zero-Downtime Swap
**Problem**: Rotating tokens breaks running bots. You have to stop → replace → restart → verify. Downtime = missed events.

**Solution**: `TokenRotator` engine with hot-swap capability.

```typescript
class TokenRotator {
  // Rotate token without stopping bot
  async rotateToken(botId: string, newToken: string): Promise<RotationResult> {
    // 1. Validate new token works (login test)
    // 2. Encrypt & store new token
    // 3. Signal running bot via IPC to hot-reload token
    // 4. Bot reconnects with new token (discord.js supports this!)
    // 5. Verify reconnection, mark old token revoked
    // 6. Audit log entry
  }
  
  // Scheduled rotation with policy
  async scheduleRotation(botId: string, policy: RotationPolicy): Promise<void>;
  
  // Emergency: revoke all tokens matching pattern
  async emergencyRevoke(pattern: string): Promise<RevokeResult>;
}
```

**Policy DSL**:
```yaml
rotation:
  schedule: "0 3 * * 0"  # Weekly 3AM Sunday
  gracePeriod: "24h"      # Overlap old+new
  notify: ["discord", "email"]
  autoApprove: false      # Require manual confirmation
```

**Why it kills competition**: Token rotation is universally feared. Making it *boring and safe* is a massive trust signal.

---

### 1.3 Message Time-Travel Debugger
**Problem**: "Why did my bot reply that way?" "What message triggered the crash?" "Show me the edit history of this message."

**Solution**: `MessageTimeTravel` — full message lifecycle replay with bot decision tracing.

```typescript
interface MessageTimeline {
  // Original message + all edits (with diffs)
  // Deleted messages (recoverable for 30 days)
  // Bot's internal decision log for each message:
  //   - Which features matched
  //   - Which conditions passed/failed
  //   - Execution time per middleware
  //   - Final action taken (reply, react, log, ignore)
  //   - Errors with stack traces
  
  replay(botId: string, messageId: string): MessageReplay;
  exportSession(sessionId: string): DebugBundle; // Shareable .zip for team debugging
}
```

**UI**: Scrubbable timeline slider. Click any point → see bot's "brain state" at that moment.

**Why it kills competition**: Debugging bot behavior is currently `console.log` archaeology. This makes it *observable*.

---

### 1.4 Fleet Template System (Infrastructure-as-Code for Bots)
**Problem**: Setting up a new bot = copy-paste config, manual feature toggles, hope you didn't miss something.

**Solution**: `FleetTemplate` — declarative bot definitions with inheritance, mixins, and validation.

```yaml
# templates/moderation-bot.yaml
extends: base-bot
features:
  message_logger: 
    enabled: true
    config:
      ignoredChannels: ["#general", "#random"]
      retentionDays: 90
  auto_mod:
    enabled: true
    config:
      rules: !include ../rules/strict.yaml
  welcome_system:
    enabled: true
    config:
      template: "welcome-embed.v2"
      dmFallback: true
permissions:
  required: [ManageMessages, KickMembers, BanMembers, ViewAuditLog]
  recommended: [Administrator]
variables:
  LOG_CHANNEL: "${{ guild.channels.mod-log }}"
  WELCOME_CHANNEL: "${{ guild.channels.welcome }}"
```

**CLI**:
```bash
phantom-fleet template apply moderation-bot --guild 12345 --name "ModBot-Prod"
phantom-fleet template validate ./my-template.yaml
phantom-fleet template diff fleet.yaml ./new-template.yaml  # See what changes
```

**Why it kills competition**: Turns bot deployment into GitOps. Version-controlled, reviewable, reproducible.

---

### 1.5 Collaborative Fleet Ops (Multi-User, RBAC, Audit Log)
**Problem**: Teams share bot fleets. No one knows who changed what. Accidental token leaks. No approval flow.

**Solution**: Built-in multi-tenancy with roles and audit trail.

```typescript
interface FleetRBAC {
  roles: {
    Owner: ["*"];                          // Full access + billing + delete fleet
    Admin: ["bots:*", "templates:*", "users:read"];  // Manage bots, templates
    Operator: ["bots:read", "bots:start", "bots:stop", "monitor:*"]; // Daily ops
    Developer: ["bots:read", "templates:read", "debug:*"]; // Debug only
    Viewer: ["bots:read", "monitor:read"]; // Read-only
  };
  
  // Every action logged with: who, what, when, before/after diff, IP, user-agent
  auditLog: AuditEntry[];
  
  // Approval workflows for sensitive actions
  approvalPolicies: {
    tokenRotation: "require_admin_approval";
    fleetExport: "require_owner_approval";
    botDelete: "require_admin_approval";
    templateApply: "notify_admin_Production: "require_approval";
  };
}
```

**Why it kills competition**: Solo-dev tools don't need this. Teams *do*. This unlocks B2B/enterprise adoption.

---

## 🎨 Phase 2: Developer Experience Polish (Weeks 5-7) — "Make It Feel Premium"

### 2.1 Dashboard UX Overhaul (Apply `make-interfaces-feel-better` Principles)
- [ ] **Concentric border radii** everywhere (cards 12px, buttons 8px, inputs 6px)
- [ ] **Optical alignment** — icon+text buttons manually tuned
- [ ] **Layered shadows** for elevation (not borders for depth)
- [ ] **Interruptible transitions** (CSS transitions, not keyframes, for hover/active)
- [ ] **Staggered enter animations** (100ms per card, semantic groups)
- [ ] **Subtle exit animations** (translateY(4px) + fade, 150ms ease-out)
- [ ] **Contextual icon animations** (scale 0.25→1, blur 4px→0, spring bounce: 0)
- [ ] **Font smoothing** (`-webkit-font-smoothing: antialiased` on root)
- [ ] **Tabular numbers** on all metrics/counters (`font-variant-numeric: tabular-nums`)
- [ ] **Text-wrap: balance** on headings, **text-wrap: pretty** on body
- [ ] **1px image outlines** (oklch(0 0 0 / 0.1) light / oklch(1 0 0 / 0.1) dark)
- [ ] **Scale(0.96) on press** for all interactive elements
- [ ] **Skip entrance animations on first load** (`initial={false}`)
- [ ] **Dark mode default** with OS preference detection + manual toggle
- [ ] **Reduced motion** respect (`prefers-reduced-motion`)
- [ ] **Keyboard navigation** — visible focus rings, logical tab order, Escape to close
- [ ] **Command palette** (Cmd+K) — search bots, channels, commands, settings

### 2.2 CLI Excellence (`phantom-fleet` as a First-Class Citizen)
- [ ] **Interactive mode** (`phantom-fleet` with no args → TUI with arrow keys)
- [ ] **Smart autocomplete** (bot names, guild IDs, template names, feature flags)
- [ ] **Rich output** — tables with colors, spinners, progress bars, JSON/CSV/YAML flags
- [ ] **Config profiles** — `phantom-fleet --profile prod` vs `--profile dev`
- [ ] **Shell completions** — `phantom-fleet completion bash/zsh/fish > ...`
- [ ] **Man pages** — `man phantom-fleet` (generated from CLI help)
- [ ] **Plugin CLI extensions** — `phantom-fleet my-plugin do-thing`

### 2.3 TypeScript-First SDK (Enable Plugin Ecosystem)
```typescript
// packages/sdk/src/index.ts
export interface FleetManagerSDK {
  bots: BotClient;
  monitors: MonitorClient;
  templates: TemplateClient;
  intelligence: IntelligenceClient;
  events: EventEmitter<FleetEvents>;
}

// Plugin author writes:
export default definePlugin({
  name: "my-awesome-feature",
  version: "1.0.0",
  async install(sdk: FleetManagerSDK) {
    sdk.bots.on("message", async (ctx) => { /* ... */ });
    sdk.templates.registerFeature("my-feature", { /* schema */ });
  }
});
```

- [ ] Publish `@discord-fleet-manager/sdk` to npm
- [ ] Generate types from OpenAPI spec (single source of truth)
- [ ] Plugin template repo: `github.com/discord-fleet-manager/plugin-template`

---

## 🌐 Phase 3: Distribution & Growth (Weeks 8-12) — "Get It In Hands"

### 3.1 One-Command Deploy Targets
| Target | Command | Time |
|--------|---------|------|
| Docker | `docker run -d -p 3000:3000 -v ./data:/data ghcr.io/...` | 30s |
| Docker Compose | `curl -fsSL deploy.discordfleet.dev/docker-compose.yml \| docker compose up -d` | 45s |
| VPS (Ubuntu) | `curl -fsSL deploy.discordfleet.dev/vps.sh \| bash` | 2min |
| Railway | "Deploy to Railway" button | 1-click |
| Render | "Deploy to Render" button | 1-click |
| Fly.io | `fly launch --image ghcr.io/...` | 1min |
| Kubernetes | `helm install fleet-manager oci://ghcr.io/.../charts/fleet-manager` | 3min |

### 3.2 Documentation Site (GitHub Pages + VitePress)
- [ ] **Guides**: Quick Start, Docker, VPS, Kubernetes, Reverse Proxy, SSL
- [ ] **Concepts**: Fleet, Bots, Monitors, Engines, Templates, Plugins
- [ ] **API Reference**: Auto-generated from OpenAPI
- [ ] **Plugin Development**: Tutorial, API, Publishing, Best Practices
- [ ] **CLI Reference**: Every command with examples
- [ ] **Troubleshooting**: Common errors, diagnostics, FAQ
- [ ] **Migration Guides**: From other tools (PM2, custom scripts, etc.)

### 3.3 Community Infrastructure
- [ ] **Discord Server** — categories: #general, #help, #showcase, #plugins, #development, #announcements, #support
- [ ] **GitHub Discussions** — Q&A, Ideas, Show and Tell, Announcements
- [ ] **Twitter/X Account** — @DiscordFleetMgr — dev updates, tips, community highlights
- [ ] **Newsletter** (Buttondown/Beehiiv) — monthly "Fleet Intel" with tips, plugin spotlights, roadmap
- [ ] **Contributor Program** — "Fleet Admirals" — special role, early access, swag, direct maintainer line

### 3.4 Launch Sequence
| Week | Milestone |
|------|-----------|
| 8 | Beta release (v0.9.0) — Discord invite only, 50 testers |
| 9 | Beta feedback sprint — fix top 20 issues |
| 10 | Release Candidate (v0.9.9) — public, "not for prod" |
| 11 | **v1.0.0 Launch** — blog post, Twitter thread, Reddit r/discordbots, Hacker News, Dev.to, Discord dev servers |
| 12 | Post-launch sprint — critical bugs, first plugin showcase |

---

## 🏆 Phase 4: Moat Deepening (Month 4+) — "Uncatchable"

### 4.1 AI-Powered Fleet Copilot
- Natural language fleet ops: `"Rotate tokens for all bots in production guilds"` → executes with confirmation
- Anomaly detection: `"Bot 'ModBot' message throughput dropped 80% in last hour — investigate?"`
- Auto-remediation suggestions with one-click apply
- **Privacy-first**: Local LLM (Ollama) or BYOK (Bring Your Own Key) — no fleet data leaves your server

### 4.2 Plugin Marketplace (In-Dashboard)
- Curated, signed, sandboxed plugins
- One-click install/update/rollback
- Revenue share for paid plugins (optional)
- Community ratings, compatibility matrix

### 4.3 Enterprise Features (Paid Tier — Sustainability)
- SSO (SAML/OIDC)
- SCIM provisioning
- Audit log streaming (Splunk, Datadog, Loki)
- SLA-backed support
- Dedicated hosting option
- **Open Core**: Core stays MIT, enterprise features in separate repo with license key

### 4.4 Mobile Companion App (React Native)
- Read-only dashboard
- Push notifications for bot down, token expiry, security alerts
- Quick actions: restart bot, pause monitor, acknowledge alert

---

## 📊 Success Metrics (North Stars)

| Metric | 3 Months | 6 Months | 12 Months |
|--------|----------|----------|-----------|
| GitHub Stars | 500 | 2,500 | 10,000 |
| Active Fleets (weekly ping) | 50 | 500 | 5,000 |
| Discord Members | 200 | 2,000 | 15,000 |
| Community Plugins | 5 | 30 | 200 |
| Contributors (monthly) | 5 | 20 | 100 |
| Docker Pulls (monthly) | 1,000 | 50,000 | 500,000 |
| npm SDK Downloads (monthly) | 500 | 10,000 | 100,000 |

---

## 🎯 Competitive Kill Shots (Why Users Switch)

| Competitor | Weakness | Our Counter |
|------------|----------|-------------|
| **PM2 + custom scripts** | No Discord awareness, no message intel, manual token mgmt | Fleet Intelligence, Message Time-Travel, Smart Token Rotator |
| **BotGhost / BotDisco** | Closed source, limited customization, no fleet view, expensive | Open source, plugin system, Fleet Templates, free self-host |
| **Custom dashboard** | Maintenance burden, no updates, solo bus factor | Auto-updates, community, plugin ecosystem, Fleet Templates |
| **Discord.js + Express DIY** | Reinventing wheels: auth, WS, DB, monitoring | Batteries included, 60-second start, production-hardened |

---

## 💰 Sustainability Model

1. **Core**: MIT forever — self-hosted, unlimited, no telemetry
2. **Cloud Hosted** (future): $29/mo per fleet — managed updates, backups, SSL, monitoring
3. **Enterprise**: Custom pricing — SSO, audit streaming, SLA, support
4. **Plugin Marketplace**: 15% on paid plugins (optional)
5. **Sponsorships**: GitHub Sponsors, OpenCollective — "Buy the fleet a coffee"

**No**: Paywalls on core features, telemetry without consent, feature gating, vendor lock-in.

---

## 🗓 Execution Checklist (First 30 Days)

### Week 1: Foundation
- [ ] Extract zip → repo root
- [ ] GitHub metadata (description, topics, OG image)
- [ ] README.md with screenshots/GIFs
- [ ] CI/CD pipeline (lint, test, build, release, docker, pages)
- [ ] LICENSE, CODE_OF_CONDUCT, CONTRIBUTING, SECURITY, SUPPORT
- [ ] Deploy demo dashboard (Railway/Render free tier)
- [ ] GitHub Pages docs site (VitePress)

### Week 2: Killer Feature 1 — Fleet Intelligence
- [ ] Design knowledge graph schema
- [ ] Implement background analyzer (cron job in manager)
- [ ] API endpoints: `/api/intelligence/*`
- [ ] Dashboard: Interactive graph view (Cytoscape.js)
- [ ] Tests + documentation

### Week 3: Killer Feature 2 — Smart Token Rotator
- [ ] Hot-token-swap in bot-runner (IPC signal)
- [ ] Rotation engine with policy DSL
- [ ] CLI + Dashboard UI
- [ ] Audit logging
- [ ] Tests + documentation

### Week 4: Killer Feature 3 — Message Time-Travel
- [ ] Decision tracing middleware in discord-monitor
- [ ] Timeline API + storage schema
- [ ] Replay UI with scrubber
- [ ] Export debug bundle
- [ ] Tests + documentation

### Week 5: Polish & Plugin System
- [ ] Dashboard UX overhaul (per make-interfaces-feel-better)
- [ ] CLI interactive mode + completions
- [ ] TypeScript SDK package
- [ ] Plugin template + example plugins (3)
- [ ] Plugin loading in manager

### Week 6: Distribution & Launch Prep
- [ ] One-command deploy scripts (Docker, VPS, Railway, Render, Fly, Helm)
- [ ] Complete documentation site
- [ ] Discord server setup + bot
- [ ] Twitter/X account + first threads
- [ ] Beta tester recruitment (50 target)

### Week 7: Beta
- [ ] v0.9.0 tag + release notes
- [ ] Onboard beta testers
- [ ] Daily feedback triage
- [ ] Fix top 20 issues

### Week 8: Launch
- [ ] v1.0.0 release
- [ ] Launch blog post + Twitter thread + Reddit + HN + Dev.to
- [ ] Community showcase (best fleet setups)
- [ ] First plugin contest announcement

---

## 📁 Repository Structure (Target)

```
discord-fleet-manager/
├── .github/
│   ├── workflows/           # CI, release, docker, pages, dependabot, codeql
│   ├── ISSUE_TEMPLATE/      # Bug, Feature, Plugin Request, Security
│   └── PULL_REQUEST_TEMPLATE.md
├── .vscode/                 # Recommended extensions, settings, launch.json
├── docs/                    # VitePress source → GitHub Pages
│   ├── guides/
│   ├── concepts/
│   ├── api/
│   ├── plugins/
│   ├── cli/
│   └── troubleshooting/
├── packages/
│   ├── manager/             # Core manager (Express + WS + engines)
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── database.ts
│   │   │   ├── crypto.ts
│   │   │   ├── bot-runner.ts
│   │   │   ├── discord-monitor.ts
│   │   │   ├── feature-registry.ts
│   │   │   ├── engines/
│   │   │   │   ├── smart-token-replacer.ts
│   │   │   │   ├── status-activity-engine.ts
│   │   │   │   ├── import-export-engine.ts
│   │   │   │   ├── fleet-intelligence.ts        # NEW
│   │   │   │   ├── token-rotator.ts             # NEW
│   │   │   │   └── message-time-travel.ts       # NEW
│   │   │   ├── features/
│   │   │   │   ├── message-logger.ts
│   │   │   │   ├── welcome-system.ts
│   │   │   │   ├── auto-mod.ts
│   │   │   │   └── plugin-loader.ts             # NEW
│   │   │   ├── intelligence/                    # NEW
│   │   │   │   ├── analyzer.ts
│   │   │   │   ├── graph-builder.ts
│   │   │   │   └── health-scorer.ts
│   │   │   ├── plugins/                         # NEW
│   │   │   │   ├── loader.ts
│   │   │   │   ├── sandbox.ts
│   │   │   │   └── registry.ts
│   │   │   └── types/
│   │   ├── tests/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── dashboard/           # React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── styles/          # CSS variables, themes, animations
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/                 # TypeScript CLI (Commander.js + Ink for TUI)
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── sdk/                 # TypeScript SDK for plugins/integrations
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── plugin-template/     # Cookiecutter template for plugins
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── .dockerignore
├── helm/                    # Helm chart for Kubernetes
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── scripts/
│   ├── deploy-vps.sh
│   ├── deploy-railway.sh
│   ├── setup-dev.sh
│   └── verify-install.sh
├── .gitignore
├── .editorconfig
├── .prettierrc
├── .eslintrc.cjs
├── package.json             # Root workspace (npm workspaces)
├── tsconfig.base.json
├── turbo.json               # Turborepo config (optional)
├── README.md
├── CHANGELOG.md
├── LICENSE
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
├── SUPPORT.md
└── VERSION.md
```

---

## 🚀 Immediate Next Actions (Do Today)

1. **Extract zip to repo root** — `cd /root/workspace/Discord-Fleet-Manager && unzip -o discord-fleet-manager-fixed.zip && mv discord-fleet-manager-fixed/* . && rm -rf discord-fleet-manager-fixed discord-fleet-manager-fixed.zip`
2. **Initialize npm workspaces** — Create root `package.json` with workspaces config
3. **Convert JS → TypeScript** — Rename `.js` to `.ts`, add types, strict mode
4. **Set up GitHub Actions CI** — Lint, typecheck, test stubs
5. **Write the README** — Use the structure in Phase 0.3
6. **Push to GitHub** — `git add . && git commit -m "chore: initial import + TypeScript conversion + CI" && git push`
7. **Configure GitHub repo settings** — Description, topics, branch protection, Pages, Actions permissions
8. **Deploy demo** — Railway one-click from repo
9. **Create Discord server** — Invite link in README
10. **Announce on Twitter/X** — "Just unarchived my Discord Fleet Manager. Building the tool I wish existed for running 50+ bots. Follow the journey 🧵"

---

## 🏁 Definition of Done (v1.0.0)

- [ ] All Phase 0, 1, 2, 3 items complete
- [ ] 90%+ test coverage on core engines
- [ ] Zero critical/high CVEs in dependencies
- [ ] Documentation complete for all user-facing features
- [ ] Plugin system with 3+ official example plugins
- [ ] One-command deploy works on 5+ platforms
- [ ] 50+ beta testers successfully running fleets
- [ ] Launch content published across 5+ channels
- [ ] First 100 GitHub stars (organic)

---

*Plan created: 2026-07-28*  
*Author: Phantom*  
*Status: **ACTIVE — Execution begins now***

---

## Appendix: Inspiration Sources Analyzed

| Repo | Stars | Key Takeaways Applied |
|------|-------|----------------------|
| `jakubkrehel/make-interfaces-feel-better` | 2.6k | 13 UI polish principles → Dashboard UX overhaul (Phase 2.1) |
| `Panniantong/Agent-Reach` | 61.3k | Multi-platform CLI design, skill system, doctor command, channel abstraction → CLI excellence (Phase 2.2), Plugin architecture (Phase 2.3) |
| `Salomondiei08/oh-my-hermes` | 721 | Skill/workflow/agent/template architecture, install scripts, VPS bootstrap → Plugin system (Phase 2.3), One-command deploy (Phase 3.1), Fleet Templates (Phase 1.4) |