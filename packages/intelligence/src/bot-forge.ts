import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { TemplateConfig, GeneratedBotProject, FeatureTemplate, VariableTemplate } from '../types/engines.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, '../../plugin-template/bot-template');

export class BotForge {
  private templates: Map<string, TemplateConfig> = new Map();

  constructor() {
    this.loadBuiltinTemplates();
  }

  private loadBuiltinTemplates(): void {
    // Moderation Bot Template
    this.templates.set('moderation-bot', {
      name: 'moderation-bot',
      description: 'Production-ready moderation bot with auto-mod, logging, tickets, and warnings',
      version: '1.0.0',
      features: {
        message_logger: { enabled: true, config: { ignoredChannels: [], retentionDays: 90 } },
        auto_mod: { 
          enabled: true, 
          config: { 
            rules: ['spam', 'links', 'invites', 'toxicity', 'mass_mentions'],
            logChannel: '{{MOD_LOG_CHANNEL}}',
            dmOnAction: true
          } 
        },
        welcome_system: { 
          enabled: true, 
          config: { 
            channel: '{{WELCOME_CHANNEL}}',
            message: 'Welcome {{user}} to {{guild}}! 🎉',
            dmFallback: true
          } 
        },
        ticket_system: { 
          enabled: true, 
          config: { 
            category: '{{TICKET_CATEGORY}}',
            staffRole: '{{STAFF_ROLE}}',
            transcriptChannel: '{{TRANSCRIPT_CHANNEL}}'
          } 
        },
        reaction_roles: { enabled: false, config: {} },
        leveling_system: { enabled: false, config: {} },
        custom_commands: { enabled: false, config: {} },
        voice_activity: { enabled: false, config: {} },
        giveaway_system: { enabled: false, config: {} }
      },
      permissions: {
        required: ['ManageMessages', 'KickMembers', 'BanMembers', 'ViewAuditLog', 'ManageChannels', 'ManageRoles', 'SendMessages', 'EmbedLinks', 'ReadMessageHistory', 'AddReactions'],
        recommended: ['Administrator']
      },
      variables: {
        MOD_LOG_CHANNEL: { type: 'channel', description: 'Channel for moderation logs', required: true },
        WELCOME_CHANNEL: { type: 'channel', description: 'Channel for welcome messages', required: true },
        TICKET_CATEGORY: { type: 'channel', description: 'Category for ticket channels', required: true },
        STAFF_ROLE: { type: 'role', description: 'Role with ticket access', required: true },
        TRANSCRIPT_CHANNEL: { type: 'channel', description: 'Channel for ticket transcripts', required: true }
      },
      files: {}
    });

    // Community Bot Template
    this.templates.set('community-bot', {
      name: 'community-bot',
      description: 'Community engagement bot with leveling, reaction roles, giveaways, and custom commands',
      version: '1.0.0',
      features: {
        message_logger: { enabled: true, config: { ignoredChannels: [], retentionDays: 30 } },
        welcome_system: { 
          enabled: true, 
          config: { 
            channel: '{{WELCOME_CHANNEL}}',
            message: 'Welcome {{user}}! Check out <#{{RULES_CHANNEL}}> and grab roles in <#{{ROLES_CHANNEL}}> 🎉',
            dmFallback: false
          } 
        },
        reaction_roles: { 
          enabled: true, 
          config: { 
            messageId: '{{REACTION_ROLES_MESSAGE}}',
            roles: {}
          } 
        },
        leveling_system: { 
          enabled: true, 
          config: { 
            xpPerMessage: 15,
            xpCooldown: 60000,
            levelUpChannel: '{{LEVEL_UP_CHANNEL}}',
            rewards: {}
          } 
        },
        custom_commands: { 
          enabled: true, 
          config: { 
            prefix: '!',
            allowUserCommands: true
          } 
        },
        giveaway_system: { 
          enabled: true, 
          config: { 
            defaultDuration: 3600000,
            winnersCount: 1,
            requiredRole: null
          } 
        },
        auto_mod: { enabled: false, config: {} },
        ticket_system: { enabled: false, config: {} },
        voice_activity: { enabled: false, config: {} }
      },
      permissions: {
        required: ['SendMessages', 'EmbedLinks', 'ReadMessageHistory', 'AddReactions', 'ManageRoles', 'ManageMessages'],
        recommended: ['Administrator']
      },
      variables: {
        WELCOME_CHANNEL: { type: 'channel', description: 'Channel for welcome messages', required: true },
        RULES_CHANNEL: { type: 'channel', description: 'Channel with server rules', required: true },
        ROLES_CHANNEL: { type: 'channel', description: 'Channel for role selection', required: true },
        REACTION_ROLES_MESSAGE: { type: 'string', description: 'Message ID for reaction roles', required: true },
        LEVEL_UP_CHANNEL: { type: 'channel', description: 'Channel for level up announcements', required: true }
      },
      files: {}
    });

    // Utility Bot Template
    this.templates.set('utility-bot', {
      name: 'utility-bot',
      description: 'Multi-purpose utility bot with logging, custom commands, and admin tools',
      version: '1.0.0',
      features: {
        message_logger: { enabled: true, config: { ignoredChannels: [], retentionDays: 60 } },
        custom_commands: { 
          enabled: true, 
          config: { 
            prefix: '!',
            allowUserCommands: true,
            builtins: ['ping', 'serverinfo', 'userinfo', 'avatar', 'roleinfo', 'channelinfo']
          } 
        },
        welcome_system: { 
          enabled: true, 
          config: { 
            channel: '{{LOG_CHANNEL}}',
            message: '{{user}} joined {{guild}}',
            dmFallback: false
          } 
        },
        auto_mod: { 
          enabled: true, 
          config: { 
            rules: ['spam', 'mass_mentions'],
            logChannel: '{{LOG_CHANNEL}}'
          } 
        },
        welcome_system: { enabled: false, config: {} },
        reaction_roles: { enabled: false, config: {} },
        leveling_system: { enabled: false, config: {} },
        ticket_system: { enabled: false, config: {} },
        voice_activity: { enabled: false, config: {} },
        giveaway_system: { enabled: false, config: {} }
      },
      permissions: {
        required: ['SendMessages', 'EmbedLinks', 'ReadMessageHistory', 'ManageMessages', 'ViewChannel'],
        recommended: ['Administrator']
      },
      variables: {
        LOG_CHANNEL: { type: 'channel', description: 'Channel for bot logs', required: true }
      },
      files: {}
    });
  }

  /**
   * List available templates
   */
  listTemplates(): Array<{ name: string; description: string; version: string; features: string[] }> {
    return Array.from(this.templates.values()).map(t => ({
      name: t.name,
      description: t.description,
      version: t.version,
      features: Object.keys(t.features).filter(f => t.features[f].enabled)
    }));
  }

  /**
   * Get template by name
   */
  getTemplate(name: string): TemplateConfig | undefined {
    return this.templates.get(name);
  }

  /**
   * Generate a bot project from template
   */
  async generate(templateName: string, variables: Record<string, string>, options: {
    outputDir: string;
    projectName: string;
    language?: 'typescript' | 'javascript';
    packageManager?: 'npm' | 'pnpm' | 'yarn';
    includeDocker?: boolean;
    includeCI?: boolean;
  }): Promise<GeneratedBotProject> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Validate variables
    const validatedVars = this.validateVariables(template, variables);

    // Create project structure
    const project = await this.createProject(template, validatedVars, options);
    
    return project;
  }

  private validateVariables(template: TemplateConfig, variables: Record<string, string>): Record<string, string> {
    const validated: Record<string, string> = {};
    
    for (const [key, varTemplate] of Object.entries(template.variables)) {
      if (varTemplate.required && !variables[key]) {
        throw new Error(`Required variable missing: ${key} (${varTemplate.description})`);
      }
      validated[key] = variables[key] || varTemplate.default as string || '';
    }
    
    // Include any extra variables
    for (const [key, value] of Object.entries(variables)) {
      if (!validated[key]) validated[key] = value;
    }
    
    return validated;
  }

  private async createProject(
    template: TemplateConfig, 
    variables: Record<string, string>,
    options: {
      outputDir: string;
      projectName: string;
      language: 'typescript' | 'javascript';
      packageManager: 'npm' | 'pnpm' | 'yarn';
      includeDocker: boolean;
      includeCI: boolean;
    }
  ): Promise<GeneratedBotProject> {
    const { outputDir, projectName, language = 'typescript', packageManager = 'npm', includeDocker = true, includeCI = true } = options;
    const projectPath = path.join(outputDir, projectName);
    
    // Create directory structure
    const dirs = [
      'src',
      'src/commands',
      'src/events',
      'src/features',
      'src/utils',
      'src/types',
      'tests',
      'dist'
    ];
    
    for (const dir of dirs) {
      fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
    }

    // Generate files
    const files: Record<string, string> = {};
    
    // package.json
    files['package.json'] = this.generatePackageJson(template, projectName, language, packageManager);
    // tsconfig.json
    files['tsconfig.json'] = this.generateTsConfig(language);
    // .env.example
    files['.env.example'] = this.generateEnvExample(template, variables);
    // .gitignore
    files['.gitignore'] = this.generateGitIgnore();
    // .eslintrc.json
    files['.eslintrc.json'] = this.generateEslintConfig(language);
    // .prettierrc
    files['.prettierrc'] = this.generatePrettierConfig();
    // README.md
    files['README.md'] = this.generateReadme(template, projectName, variables);
    // Dockerfile
    if (includeDocker) files['Dockerfile'] = this.generateDockerfile(language);
    // docker-compose.yml
    if (includeDocker) files['docker-compose.yml'] = this.generateDockerCompose(projectName);
    // GitHub Actions
    if (includeCI) files['.github/workflows/ci.yml'] = this.generateGitHubActions(language, packageManager);
    
    // Source files
    files['src/index.ts'] = this.generateIndex(template, variables, language);
    files['src/types/index.ts'] = this.generateTypes();
    files['src/utils/config.ts'] = this.generateConfig(template, variables);
    files['src/utils/logger.ts'] = this.generateLogger();
    files['src/utils/discord.ts'] = this.generateDiscordUtils();
    
    // Features
    for (const [featureName, feature] of Object.entries(template.features)) {
      if (feature.enabled) {
        const featureFiles = this.generateFeature(featureName, feature.config, variables, language);
        Object.assign(files, featureFiles);
      }
    }

    // Write all files
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(projectPath, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    // Build structure list
    const structure = Object.keys(files).sort();

    return {
      name: projectName,
      path: projectPath,
      structure,
      files,
      packageJson: JSON.parse(files['package.json']),
      tsconfigJson: JSON.parse(files['tsconfig.json']),
      dockerfile: files['Dockerfile'] || '',
      dockerCompose: files['docker-compose.yml'] || '',
      githubWorkflow: files['.github/workflows/ci.yml'] || '',
      readme: files['README.md']
    };
  }

  private generatePackageJson(template: TemplateConfig, projectName: string, language: string, packageManager: string): string {
    const enabledFeatures = Object.keys(template.features).filter(f => template.features[f].enabled);
    
    return JSON.stringify({
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: template.description,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        dev: language === 'typescript' ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
        build: language === 'typescript' ? 'tsc' : 'echo "No build needed for JS"',
        start: 'node dist/index.js',
        lint: 'eslint src --ext .ts,.js',
        format: 'prettier --write "src/**/*.{ts,js}"',
        test: 'vitest run',
        'test:watch': 'vitest',
        'db:init': 'tsx src/database/init.ts',
        docker: 'docker build -t {{PROJECT_NAME}} .',
        'docker:run': 'docker run -d --env-file .env {{PROJECT_NAME}}'
      },
      dependencies: {
        'discord.js': '^14.14.1',
        'dotenv': '^16.3.1',
        'zod': '^3.22.4',
        'winston': '^3.11.0'
      },
      devDependencies: {
        '@types/node': '^20.10.0',
        '@typescript-eslint/eslint-plugin': '^6.13.0',
        '@typescript-eslint/parser': '^6.13.0',
        'eslint': '^8.55.0',
        'eslint-config-prettier': '^9.1.0',
        'prettier': '^3.1.0',
        'tsx': '^4.6.0',
        'typescript': '^5.3.2',
        'vitest': '^1.0.4'
      },
      engines: { node: '>=20.0.0' },
      packageManager: packageManager + '@latest'
    }, null, 2);
  }

  private generateTsConfig(language: string): string {
    if (language === 'javascript') return '{}';
    
    return JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        baseUrl: '.',
        paths: {
          '@/*': ['src/*']
        },
        typeRoots: ['./types', './node_modules/@types'],
        allowSyntheticDefaultImports: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts']
    }, null, 2);
  }

  private generateEnvExample(template: TemplateConfig, variables: Record<string, string>): string {
    const lines = [
      '# Discord Bot Token (REQUIRED)',
      'DISCORD_TOKEN=your_bot_token_here',
      'CLIENT_ID=your_client_id_here',
      '',
      '# Feature Configuration'
    ];

    for (const [key, value] of Object.entries(variables)) {
      lines.push(`${key}=${value}`);
    }

    lines.push('', '# Optional: Database', 'DATABASE_PATH=./data/bot.db', '');
    lines.push('# Optional: Redis for clustering', '# REDIS_URL=redis://localhost:6379');
    
    return lines.join('\n');
  }

  private generateGitIgnore(): string {
    return `node_modules
dist
.env
.env.local
*.log
.DS_Store
coverage
*.sqlite
*.db
.vscode/*
!.vscode/extensions.json
.idea
*.swp
*.swo
`;
  }

  private generateEslintConfig(language: string): string {
    return JSON.stringify({
      root: true,
      env: { node: true, es2022: true },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier'
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      },
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'prefer-const': 'error',
        'no-var': 'error'
      },
      ignorePatterns: ['dist/', 'node_modules/', '*.config.*']
    }, null, 2);
  }

  private generatePrettierConfig(): string {
    return JSON.stringify({
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'es5',
      printWidth: 100,
      bracketSpacing: true,
      arrowParens: 'avoid',
      endOfLine: 'lf'
    }, null, 2);
  }

  private generateReadme(template: TemplateConfig, projectName: string, variables: Record<string, string>): string {
    const enabledFeatures = Object.keys(template.features).filter(f => template.features[f].enabled);
    
    return `# ${projectName}

${template.description}

## Features
${enabledFeatures.map(f => `- ✅ **${f.replace(/_/g, ' ')}**: ${this.getFeatureDescription(f)}`).join('\n')}

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.example .env
# Edit .env with your token and config

# Development
npm run dev

# Production build
npm run build
npm start
\`\`\`

## Docker

\`\`\`bash
npm run docker
npm run docker:run
\`\`\`

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| DISCORD_TOKEN | Bot token from Discord Developer Portal | Yes |
| CLIENT_ID | Application ID from Discord Developer Portal | Yes |
${Object.entries(variables).map(([k, v]) => `| ${k} | ${template.variables[k]?.description || 'Custom variable'} | ${template.variables[k]?.required ? 'Yes' : 'No'} |`).join('\n')}

## Commands

\`\`\`
/ping - Check bot latency
/serverinfo - Server information
/userinfo - User information
/avatar - Get user avatar
\`\`\`

## Project Structure

\`\`\`
src/
├── index.ts           # Entry point
├── commands/          # Slash commands
├── events/            # Discord event handlers
├── features/          # Feature implementations
├── utils/             # Shared utilities
└── types/             # TypeScript types
\`\`\`

## License

MIT
`;
  }

  private getFeatureDescription(feature: string): string {
    const descriptions: Record<string, string> = {
      message_logger: 'Real-time message monitoring with edit/delete tracking',
      welcome_system: 'Customizable welcome messages with embed support',
      auto_mod: 'Automated moderation with configurable rules',
      reaction_roles: 'Self-serve role assignment via reactions',
      leveling_system: 'XP-based leveling with rewards and leaderboards',
      ticket_system: 'Support ticket system with transcripts',
      custom_commands: 'User-created custom commands',
      voice_activity: 'Voice channel activity tracking',
      giveaway_system: 'Automated giveaway management'
    };
    return descriptions[feature] || 'Feature enabled';
  }

  private generateDockerfile(language: string): string {
    return `# Multi-stage build for smaller production image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ${language === 'typescript' ? 'tsconfig.json' : ''} ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source
COPY src/ ./src/

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built files and production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
`;
  }

  private generateDockerCompose(projectName: string): string {
    return `version: '3.8'

services:
  ${projectName}:
    build: .
    container_name: ${projectName}
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    networks:
      - ${projectName}-network

networks:
  ${projectName}-network:
    driver: bridge

volumes:
  data:
  logs:
`;
  }

  private generateGitHubActions(language: string, packageManager: string): string {
    return `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: '${packageManager}'

      - name: Install dependencies
        run: ${packageManager} ci

      - name: Lint
        run: ${packageManager} run lint

      - name: Format check
        run: ${packageManager} run format -- --check

      - name: Type check
        run: ${packageManager} run build

      - name: Test
        run: ${packageManager} run test

      - name: Build Docker
        if: github.event_name == 'push'
        run: |
          docker build -t ${{ github.repository }}:${{ github.sha }} .
          docker build -t ${{ github.repository }}:latest .

  release:
    needs: lint-and-test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Semantic Release
        uses: cycjimmy/semantic-release-action@v4
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
`;
  }

  private generateIndex(template: TemplateConfig, variables: Record<string, string>, language: string): string {
    const enabledFeatures = Object.keys(template.features).filter(f => template.features[f].enabled);
    
    return `import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection, Events } from 'discord.js';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { registerCommands } from './utils/discord.js';
${enabledFeatures.map(f => `import { ${this.getFeatureImportName(f)} } from './features/${f}.js';`).join('\n')}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

${enabledFeatures.map(f => `const ${this.getFeatureImportName(f)} = ${this.getFeatureImportName(f)}(client, config);`).join('\n')}

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(\`🤖 Logged in as \${readyClient.user.tag}\`);
  
  // Register slash commands
  await registerCommands(readyClient, config);
  
  // Initialize features
  ${enabledFeatures.map(f => `await ${this.getFeatureImportName(f)}.init?.();`).join('\n  ')}
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  // Message logger runs on all messages
  ${enabledFeatures.includes('message_logger') ? 'await messageLogger.onMessage(message);' : ''}
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (newMessage.author.bot) return;
  ${enabledFeatures.includes('message_logger') ? 'await messageLogger.onMessageUpdate(oldMessage, newMessage);' : ''}
});

client.on(Events.MessageDelete, async (message) => {
  if (message.author.bot) return;
  ${enabledFeatures.includes('message_logger') ? 'await messageLogger.onMessageDelete(message);' : ''}
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error('Command error:', error);
    await interaction.reply({ content: 'An error occurred.', ephemeral: true });
  }
});

${enabledFeatures.map(f => this.getFeatureEventHandlers(f)).join('\n')}

client.login(config.DISCORD_TOKEN).catch((error) => {
  logger.error('Failed to login:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await client.destroy();
  process.exit(0);
});

export { client };
`;
  }

  private getFeatureImportName(feature: string): string {
    return feature.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private getFeatureEventHandlers(feature: string): string {
    const handlers: Record<string, string> = {
      welcome_system: `
client.on(Events.GuildMemberAdd, async (member) => {
  await welcomeSystem.onMemberJoin(member);
});`,
      reaction_roles: `
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  await reactionRoles.onReactionAdd(reaction, user);
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot) return;
  await reactionRoles.onReactionRemove(reaction, user);
});`,
      leveling_system: `
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  await levelingSystem.onMessage(message);
});`,
      voice_activity: `
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  await voiceActivity.onVoiceStateUpdate(oldState, newState);
});`
    };
    return handlers[feature] || '';
  }

  private generateTypes(): string {
    return `import { Client, Collection, CommandInteraction } from 'discord.js';

export interface BotConfig {
  DISCORD_TOKEN: string;
  CLIENT_ID: string;
  [key: string]: string | undefined;
}

export interface Command {
  data: any; // SlashCommandBuilder
  execute: (interaction: CommandInteraction) => Promise<void>;
  cooldown?: number;
}

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}
`;
  }

  private generateConfig(template: TemplateConfig, variables: Record<string, string>): string {
    return `import { z } from 'zod';

const configSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  ${Object.entries(template.variables).map(([key, v]) => `${key}: z.string().${v.required ? 'min(1)' : 'optional()'}`).join(',\n  ')}
});

export const config = configSchema.parse(process.env);

export type Config = z.infer<typeof configSchema>;
`;
  }

  private generateLogger(): string {
    return `import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'discord-bot' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});
`;
  }

  private generateDiscordUtils(): string {
    return `import { Client, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from './config.js';
import { logger } from './logger.js';

export async function registerCommands(client: Client, config: any): Promise<void> {
  const commands = client.commands.map(cmd => cmd.data.toJSON());
  
  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
  
  try {
    logger.info('Registering slash commands...');
    
    await rest.put(
      Routes.applicationCommands(config.CLIENT_ID),
      { body: commands }
    );
    
    logger.info(\`Successfully registered \${commands.length} commands\`);
  } catch (error) {
    logger.error('Failed to register commands:', error);
  }
}

export function createCommand(data: SlashCommandBuilder, execute: (interaction: any) => Promise<void>) {
  return { data, execute };
}
`;
  }

  private generateFeature(featureName: string, config: any, variables: Record<string, string>, language: string): Record<string, string> {
    const files: Record<string, string> = {};
    const className = this.getFeatureImportName(featureName);
    const fileName = featureName.replace(/_/g, '-');
    
    // Feature index
    files[`src/features/${fileName}.ts`] = this.generateFeatureIndex(className, featureName, config, variables);
    
    // Feature types
    files[`src/features/${fileName}/types.ts`] = this.generateFeatureTypes(featureName);
    
    // Feature commands (if any)
    if (this.hasCommands(featureName)) {
      files[`src/features/${fileName}/commands.ts`] = this.generateFeatureCommands(featureName, config, className);
    }
    
    // Feature events (if any)
    if (this.hasEvents(featureName)) {
      files[`src/features/${fileName}/events.ts`] = this.generateFeatureEvents(featureName, config, className);
    }
    
    return files;
  }

  private generateFeatureIndex(className: string, featureName: string, config: any, variables: Record<string, string>): string {
    const handlers = this.getFeatureHandlers(featureName);
    
    return `import { Client } from 'discord.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
${handlers.imports.join('\n')}

export interface ${className}Config {
  ${Object.entries(config).map(([k, v]) => `${k}: ${typeof v === 'string' ? 'string' : typeof v};`).join('\n  ')}
}

export interface ${className} {
  init: () => Promise<void>;
  ${handlers.methods.join('\n  ')}
}

export function ${className}(client: Client, globalConfig: any): ${className} {
  const featureConfig: ${className}Config = {
    ${Object.entries(config).map(([k, v]) => `${k}: config.${k.toUpperCase()} ?? ${JSON.stringify(v)}`).join(',\n    ')}
  };

  return {
    async init() {
      logger.info('Initializing ${featureName}...');
      ${handlers.init.join('\n      ')}
    },
    ${handlers.methods.map(m => `${m}: async () => { ${handlers.bodies[m] || '/* implementation */' } }`).join(',\n    ')}
  };
}
`;
  }

  private getFeatureHandlers(featureName: string): { imports: string[]; init: string[]; methods: string[]; bodies: Record<string, string> } {
    const handlers: Record<string, any> = {
      message_logger: {
        imports: ["import { MessageLogger } from './message-logger/types.js';"],
        init: ['this.logger = new MessageLogger(client, featureConfig);'],
        methods: ['onMessage', 'onMessageUpdate', 'onMessageDelete'],
        bodies: {
          onMessage: 'return this.logger.log(message);',
          onMessageUpdate: 'return this.logger.onEdit(oldMessage, newMessage);',
          onMessageDelete: 'return this.logger.onDelete(message);'
        }
      },
      welcome_system: {
        imports: ["import { WelcomeSystem } from './welcome-system/types.js';"],
        init: ['this.welcome = new WelcomeSystem(client, featureConfig);'],
        methods: ['onMemberJoin'],
        bodies: { onMemberJoin: 'return this.welcome.sendWelcome(member);' }
      },
      auto_mod: {
        imports: ["import { AutoMod } from './auto-mod/types.js';"],
        init: ['this.automod = new AutoMod(client, featureConfig);'],
        methods: ['onMessage'],
        bodies: { onMessage: 'return this.automod.check(message);' }
      },
      reaction_roles: {
        imports: ["import { ReactionRoles } from './reaction-roles/types.js';"],
        init: ['this.reactionRoles = new ReactionRoles(client, featureConfig);'],
        methods: ['onReactionAdd', 'onReactionRemove'],
        bodies: {
          onReactionAdd: 'return this.reactionRoles.handleAdd(reaction, user);',
          onReactionRemove: 'return this.reactionRoles.handleRemove(reaction, user);'
        }
      },
      leveling_system: {
        imports: ["import { LevelingSystem } from './leveling-system/types.js';"],
        init: ['this.leveling = new LevelingSystem(client, featureConfig);'],
        methods: ['onMessage'],
        bodies: { onMessage: 'return this.leveling.processMessage(message);' }
      },
      ticket_system: {
        imports: ["import { TicketSystem } from './ticket-system/types.js';"],
        init: ['this.tickets = new TicketSystem(client, featureConfig);'],
        methods: ['onInteraction'],
        bodies: { onInteraction: 'return this.tickets.handleInteraction(interaction);' }
      },
      custom_commands: {
        imports: ["import { CustomCommands } from './custom-commands/types.js';"],
        init: ['this.commands = new CustomCommands(client, featureConfig);'],
        methods: ['onMessage', 'registerCommand'],
        bodies: {
          onMessage: 'return this.commands.process(message);',
          registerCommand: 'return this.commands.register(name, response, userId);'
        }
      },
      voice_activity: {
        imports: ["import { VoiceActivity } from './voice-activity/types.js';"],
        init: ['this.voice = new VoiceActivity(client, featureConfig);'],
        methods: ['onVoiceStateUpdate'],
        bodies: { onVoiceStateUpdate: 'return this.voice.track(oldState, newState);' }
      },
      giveaway_system: {
        imports: ["import { GiveawaySystem } from './giveaway-system/types.js';"],
        init: ['this.giveaways = new GiveawaySystem(client, featureConfig);'],
        methods: ['onInteraction', 'createGiveaway'],
        bodies: {
          onInteraction: 'return this.giveaways.handleInteraction(interaction);',
          createGiveaway: 'return this.giveaways.create(options);'
        }
      }
    };
    return handlers[featureName] || { imports: [], init: [], methods: [], bodies: {} };
  }

  private generateFeatureTypes(featureName: string): string {
    return `// Types for ${featureName}
export interface ${this.getFeatureImportName(featureName)}Config {
  // Add config types here
}
`;
  }

  private generateFeatureCommands(featureName: string, config: any, className: string): string {
    return `import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { createCommand } from '../utils/discord.js';

export const ${featureName}Commands = [
  // Add commands here
  createCommand(
    new SlashCommandBuilder()
      .setName('${featureName.replace(/_/g, '-')}')
      .setDescription('${featureName} commands'),
    async (interaction: ChatInputCommandInteraction) => {
      await interaction.reply({ content: '${featureName} feature', ephemeral: true });
    }
  )
];
`;
  }

  private generateFeatureEvents(featureName: string, config: any, className: string): string {
    return `// Event handlers for ${featureName}
export const ${featureName}Events = {
  // Add event handlers here
};
`;
  }

  private hasCommands(featureName: string): boolean {
    return ['reaction_roles', 'leveling_system', 'ticket_system', 'custom_commands', 'giveaway_system'].includes(featureName);
  }

  private hasEvents(featureName: string): boolean {
    return ['welcome_system', 'reaction_roles', 'leveling_system', 'voice_activity', 'ticket_system', 'giveaway_system'].includes(featureName);
  }
}

export default BotForge;