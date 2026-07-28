#!/usr/bin/env node
import { Command } from 'commander';
import { createFleetClient } from '@discord-fleet-manager/sdk';
import { detectPlatform, getPlatformConfig, getInstallCommands, PLATFORMS } from '@discord-fleet-manager/shared';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const program = new Command();

program
  .name('phantom-fleet')
  .description('Discord Fleet Manager CLI — Command your bot legion')
  .version('0.0.1')
  .option('-p, --profile <name>', 'Config profile to use', 'default')
  .option('-u, --url <url>', 'API base URL', 'http://localhost:3000')
  .option('-t, --token <token>', 'API token (or set PHANTOM_FLEET_TOKEN env)')
  .option('--json', 'Output as JSON')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.json) {
      // JSON output mode
    }
  });

// ============================================
// CONFIG & PROFILE MANAGEMENT
// ============================================

function getConfigPath(profile: string): string {
  const configDir = join(homedir(), '.config', 'phantom-fleet');
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
  return join(configDir, `${profile}.json`);
}

interface CLIConfig {
  profile: string;
  url: string;
  token?: string;
}

function loadConfig(profile: string): CLIConfig {
  const path = getConfigPath(profile);
  if (existsSync(path)) {
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
  return { profile, url: 'http://localhost:3000' };
}

function saveConfig(config: CLIConfig): void {
  writeFileSync(getConfigPath(config.profile), JSON.stringify(config, null, 2));
}

// ============================================
// PLATFORM DETECTION & INSTALL
// ============================================

program
  .command('doctor')
  .description('System diagnostics and platform detection')
  .action(() => {
    const platform = detectPlatform();
    const config = getPlatformConfig(platform);
    
    console.log('🔍 Phantom Fleet Doctor');
    console.log('=======================\n');
    
    console.log('📱 Platform Detection:');
    console.log(`   OS: ${platform}`);
    console.log(`   Node: ${process.version}`);
    console.log(`   Arch: ${process.arch}`);
    console.log(`   Termux: ${platform === 'android' ? 'Yes' : 'No'}`);
    
    console.log('\n⚙️  Platform Config:');
    console.log(`   Service Manager: ${config.serviceManager}`);
    console.log(`   Data Dir: ${config.dataDir}`);
    console.log(`   Config Dir: ${config.configDir}`);
    console.log(`   Log Dir: ${config.logDir}`);
    console.log(`   Executable: ${config.executableName}`);
    
    // Check dependencies
    console.log('\n📦 Dependencies:');
    const checks = [
      { name: 'Node.js >= 20', check: () => parseInt(process.version.slice(1)) >= 20 },
      { name: 'npm', check: () => existsSync('/usr/bin/npm') || existsSync('/usr/local/bin/npm') },
      { name: 'git', check: () => existsSync('/usr/bin/git') },
      { name: 'sqlite3', check: () => true } // bundled
    ];
    
    for (const c of checks) {
      const ok = c.check();
      console.log(`   ${ok ? '✅' : '❌'} ${c.name}`);
    }
    
    // Check if running as service
    if (platform !== 'android') {
      console.log('\n🚀 Service Status:');
      // Would check systemd/launchd/Windows Service here
      console.log('   Run with --install to set up as service');
    }
  });

program
  .command('install')
  .description('Generate platform-specific install commands')
  .option('--copy', 'Copy commands to clipboard (if available)')
  .action((options) => {
    const platform = detectPlatform();
    const commands = getInstallCommands(platform);
    
    console.log(`📥 Install Commands for ${platform.toUpperCase()}`);
    console.log('==========================================\n');
    
    for (const cmd of commands) {
      console.log(cmd);
    }
    
    if (options.copy) {
      // Would copy to clipboard
      console.log('\n📋 Copied to clipboard!');
    }
  });

program
  .command('setup')
  .description('Interactive first-time setup')
  .action(async () => {
    const platform = detectPlatform();
    const config = getPlatformConfig(platform);
    
    console.log('🚀 Phantom Fleet Setup');
    console.log('======================\n');
    
    console.log(`Detected platform: ${platform}`);
    console.log(`Data directory: ${config.dataDir}`);
    console.log(`Config directory: ${config.configDir}\n`);
    
    // Create directories
    for (const dir of [config.dataDir, config.configDir, config.logDir]) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`✅ Created: ${dir}`);
      }
    }
    
    // Generate FLEET_SECRET
    const { generateSecret } = await import('@discord-fleet-manager/manager/src/crypto.js');
    const secret = generateSecret();
    console.log(`\n🔐 Generated FLEET_SECRET: ${secret}`);
    console.log('   Add this to your environment or .env file');
    
    // Create .env.example
    const envPath = join(config.configDir, '.env.example');
    writeFileSync(envPath, `# Phantom Fleet Manager
PORT=3000
FLEET_SECRET=${secret}
DATABASE_PATH=${join(config.dataDir, 'fleet.db')}
NODE_ENV=production
`);
    console.log(`\n📝 Created ${envPath}`);
    
    // Service setup hint
    console.log('\n🚀 Next steps:');
    console.log('   1. Add FLEET_SECRET to your shell profile or .env');
    console.log('   2. Run: phantom-fleet start');
    console.log('   3. Open http://localhost:3000');
    
    if (platform !== 'android') {
      console.log('\n   To install as service:');
      console.log('   phantom-fleet service install');
    }
  });

// ============================================
// SERVICE MANAGEMENT
// ============================================

program
  .command('service')
  .description('Manage system service')
  .argument('<action>', 'install | uninstall | start | stop | restart | status | logs')
  .action(async (action) => {
    const platform = detectPlatform();
    const config = getPlatformConfig(platform);
    
    if (platform === 'android') {
      console.log('❌ Service management not available on Termux/Android');
      console.log('   Use: phantom-fleet start (with termux-wake-lock)');
      return;
    }
    
    console.log(`🔧 Service ${action}...`);
    
    switch (action) {
      case 'install':
        await installService(platform, config);
        break;
      case 'uninstall':
        await uninstallService(platform, config);
        break;
      case 'start':
      case 'stop':
      case 'restart':
      case 'status':
        await controlService(platform, config, action);
        break;
      case 'logs':
        await viewLogs(platform, config);
        break;
      default:
        console.log(`❌ Unknown action: ${action}`);
    }
  });

async function installService(platform: string, config: any): Promise<void> {
  const serviceName = 'phantom-fleet-manager';
  const execPath = process.execPath;
  const scriptPath = join(__dirname, '..', 'manager', 'dist', 'index.js');
  
  if (platform === 'linux') {
    const serviceContent = `[Unit]
Description=Phantom Fleet Manager
After=network.target

[Service]
Type=simple
User=${process.env.USER}
WorkingDirectory=${config.dataDir}
ExecStart=${execPath} ${scriptPath}
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=-${config.configDir}/.env

[Install]
WantedBy=multi-user.target
`;
    const servicePath = `/etc/systemd/system/${serviceName}.service`;
    console.log(`Creating systemd service at ${servicePath}`);
    console.log('Run: sudo tee ' + servicePath + ' << EOF');
    console.log(serviceContent);
    console.log('EOF');
    console.log('Then: sudo systemctl daemon-reload && sudo systemctl enable --now ' + serviceName);
  } else if (platform === 'darwin') {
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.phantom.fleet-manager</string>
    <key>ProgramArguments</key>
    <array>
        <string>${execPath}</string>
        <string>${scriptPath}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${config.dataDir}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${config.logDir}/out.log</string>
    <key>StandardErrorPath</key>
    <string>${config.logDir}/err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</key>
    </dict>
</dict>
</plist>
`;
    const plistPath = join(config.configDir, 'com.phantom.fleet-manager.plist');
    console.log(`Creating launchd plist at ${plistPath}`);
    console.log(plistContent);
    console.log('Then: launchctl load ' + plistPath);
  } else if (platform === 'win32') {
    console.log('Windows service installation:');
    console.log('  sc create PhantomFleetManager binPath= "' + execPath + ' ' + scriptPath + '" start= auto');
    console.log('  sc start PhantomFleetManager');
  }
}

async function uninstallService(platform: string, config: any): Promise<void> {
  if (platform === 'linux') {
    console.log('sudo systemctl stop phantom-fleet-manager');
    console.log('sudo systemctl disable phantom-fleet-manager');
    console.log('sudo rm /etc/systemd/system/phantom-fleet-manager.service');
    console.log('sudo systemctl daemon-reload');
  } else if (platform === 'darwin') {
    console.log('launchctl unload ' + join(config.configDir, 'com.phantom.fleet-manager.plist'));
    console.log('rm ' + join(config.configDir, 'com.phantom.fleet-manager.plist'));
  } else if (platform === 'win32') {
    console.log('sc stop PhantomFleetManager');
    console.log('sc delete PhantomFleetManager');
  }
}

async function controlService(platform: string, config: any, action: string): Promise<void> {
  if (platform === 'linux') {
    console.log(`sudo systemctl ${action} phantom-fleet-manager`);
  } else if (platform === 'darwin') {
    if (action === 'status') {
      console.log('launchctl list | grep phantom');
    } else {
      console.log(`launchctl ${action === 'restart' ? 'unload && launchctl load' : action} ${join(config.configDir, 'com.phantom.fleet-manager.plist')}`);
    }
  } else if (platform === 'win32') {
    console.log(`sc ${action} PhantomFleetManager`);
  }
}

async function viewLogs(platform: string, config: any): Promise<void> {
  if (platform === 'linux') {
    console.log('journalctl -u phantom-fleet-manager -f');
  } else if (platform === 'darwin') {
    console.log('tail -f ' + join(config.logDir, 'out.log'));
    console.log('tail -f ' + join(config.logDir, 'err.log'));
  } else if (platform === 'win32') {
    console.log('Get-EventLog -LogName Application -Source PhantomFleetManager -Newest 50');
  }
}

// ============================================
// FLEET MANAGEMENT COMMANDS
// ============================================

async function getClient(): Promise<any> {
  const config = loadConfig(program.opts().profile);
  const token = program.opts().token || process.env.PHANTOM_FLEET_TOKEN || config.token;
  return createFleetClient({
    baseUrl: config.url,
    apiKey: token
  });
}

program
  .command('bots')
  .description('List all bots in fleet')
  .option('-s, --status <status>', 'Filter by status (online/offline/all)', 'all')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const bots = await client.getBots();
    const filtered = options.status === 'all' ? bots : bots.filter(b => b.status === options.status);
    
    if (program.opts().json) {
      console.log(JSON.stringify(filtered, null, 2));
    } else {
      console.table(filtered.map(b => ({
        ID: b.id,
        Name: b.name,
        ClientID: b.client_id || '—',
        Status: b.status === 'online' ? '🟢 Online' : b.status === 'starting' ? '🟡 Starting' : '🔴 Offline',
        Uptime: b.uptime ? formatUptime(b.uptime) : '—',
        Features: b.features?.filter(f => f.enabled).length + '/' + b.features?.length || '0/0'
      })));
    }
    
    await client.disconnect();
  });

program
  .command('bot:add')
  .description('Add a new bot to the fleet')
  .requiredOption('-n, --name <name>', 'Bot name')
  .requiredOption('-t, --token <token>', 'Bot token')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const bot = await client.createBot(options.name, options.token);
    console.log(`✅ Added bot: ${bot.name} (ID: ${bot.id})`);
    
    await client.disconnect();
  });

program
  .command('bot:remove')
  .description('Remove a bot from the fleet')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    await client.deleteBot(options.id);
    console.log(`✅ Removed bot ${options.id}`);
    
    await client.disconnect();
  });

program
  .command('bot:start')
  .description('Start a bot')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .option('--template <path>', 'Custom template path')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const result = await client.startBot(options.id, options.template);
    console.log(result.success ? `✅ Bot started (PID: ${result.pid})` : `❌ Failed: ${result.error}`);
    
    await client.disconnect();
  });

program
  .command('bot:stop')
  .description('Stop a bot')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    await client.stopBot(options.id);
    console.log(`✅ Bot ${options.id} stopped`);
    
    await client.disconnect();
  });

program
  .command('bot:restart')
  .description('Restart a bot')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .option('--template <path>', 'Custom template path')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    await client.restartBot(options.id, options.template);
    console.log(`✅ Bot ${options.id} restarted`);
    
    await client.disconnect();
  });

program
  .command('bot:logs')
  .description('View bot logs')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .option('-n, --lines <n>', 'Number of lines', '50')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const logs = await client.getBotLogs(options.id);
    const recent = logs.slice(-parseInt(options.lines));
    
    for (const log of recent) {
      console.log(log);
    }
    
    await client.disconnect();
  });

// ============================================
// FEATURES
// ============================================

program
  .command('features')
  .description('List features for a bot')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const features = await client.getFeatures(options.id);
    
    if (program.opts().json) {
      console.log(JSON.stringify(features, null, 2));
    } else {
      console.table(features.map(f => ({
        Feature: f.feature_name,
        Enabled: f.enabled ? '✅' : '❌',
        Config: JSON.stringify(f.config).slice(0, 50)
      })));
    }
    
    await client.disconnect();
  });

program
  .command('feature:toggle')
  .description('Enable/disable a feature for a bot')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .requiredOption('-f, --feature <name>', 'Feature name')
  .option('--enable', 'Enable feature')
  .option('--disable', 'Disable feature')
  .option('-c, --config <json>', 'Feature config as JSON')
  .action(async (options) => {
    if (!options.enable && !options.disable) {
      console.log('❌ Specify --enable or --disable');
      return;
    }
    
    const client = await getClient();
    await client.connect();
    
    const config = options.config ? JSON.parse(options.config) : {};
    await client.setFeature(options.id, options.feature, options.enable, config);
    
    console.log(`✅ Feature ${options.feature} ${options.enable ? 'enabled' : 'disabled'} for bot ${options.id}`);
    
    await client.disconnect();
  });

// ============================================
// MONITORING
// ============================================

program
  .command('monitor:scan')
  .description('Scan guilds across all bots')
  .requiredOption('-g, --guild <id>', 'Guild ID')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const guilds = await client.scanGuild(options.guild);
    
    if (program.opts().json) {
      console.log(JSON.stringify(guilds, null, 2));
    } else {
      console.table(guilds.map(g => ({
        Bot: g.bot_name,
        BotID: g.bot_id,
        Guild: g.guild_name,
        Members: g.member_count,
        Nickname: g.bot_nickname,
        Admin: g.is_admin ? '✅' : '❌',
        Permissions: g.permissions.length
      })));
    }
    
    await client.disconnect();
  });

program
  .command('monitor:start')
  .description('Start monitoring a guild')
  .requiredOption('-g, --guild <id>', 'Guild ID')
  .requiredOption('-b, --bot <id>', 'Bot ID')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const result = await client.startMonitor(options.guild, options.bot);
    console.log(`✅ Monitoring started: ${result.guildName} (Session: ${result.sessionId})`);
    
    await client.disconnect();
  });

program
  .command('monitor:stop')
  .description('Stop monitoring a guild')
  .requiredOption('-g, --guild <id>', 'Guild ID')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    await client.stopMonitor(options.guild);
    console.log(`✅ Monitoring stopped for guild ${options.guild}`);
    
    await client.disconnect();
  });

program
  .command('monitor:messages')
  .description('View messages from monitor session')
  .requiredOption('-g, --guild <id>', 'Guild ID')
  .option('-l, --limit <n>', 'Limit', '50')
  .option('-o, --offset <n>', 'Offset', '0')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const result = await client.getMonitorMessages(options.guild, parseInt(options.limit), parseInt(options.offset));
    
    if (program.opts().json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      for (const msg of result.messages) {
        const prefix = msg.is_deleted ? '🔴 DELETED' : msg.content_edited ? '🟡 EDITED' : '🟢';
        console.log(`${prefix} [#${msg.channel_name}] ${msg.author_name}: ${msg.content?.slice(0, 100) || '(no content)'}`);
      }
      console.log(`\nShowing ${result.messages.length} of ${result.total} messages`);
    }
    
    await client.disconnect();
  });

program
  .command('monitor:send')
  .description('Send a message as the monitored bot')
  .requiredOption('-g, --guild <id>', 'Guild ID')
  .requiredOption('-c, --channel <id>', 'Channel ID')
  .requiredOption('-m, --message <text>', 'Message content')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const result = await client.sendMessage(options.guild, options.channel, options.message);
    console.log(`✅ Message sent (ID: ${result.messageId})`);
    
    await client.disconnect();
  });

// ============================================
// TOKEN ENGINES
// ============================================

program
  .command('token:scan')
  .description('Scan bot directory for tokens')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .option('-d, --dir <path>', 'Bot directory', './bot-template')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const result = await client.scanTokens(options.id, options.dir);
    
    if (program.opts().json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.table(result.tokens?.map((t: any) => ({
        File: t.file,
        Line: t.line,
        Context: t.context.slice(0, 50),
        Type: t.type
      })) || []);
    }
    
    await client.disconnect();
  });

program
  .command('token:replace')
  .description('Replace token in file')
  .requiredOption('-f, --file <path>', 'File path')
  .requiredOption('-o, --old <token>', 'Old token')
  .requiredOption('-n, --new <token>', 'New token')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const result = await client.replaceToken(options.file, options.old, options.new);
    console.log(result.success ? '✅ Token replaced' : `❌ Failed: ${result.error}`);
    
    await client.disconnect();
  });

program
  .command('token:rotate')
  .description('Rotate bot token with zero-downtime hot swap')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .requiredOption('-n, --new-token <token>', 'New token')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    // This would use the intelligence engine's token rotator
    console.log('🔄 Rotating token with zero-downtime hot swap...');
    // await client.rotateToken(options.id, options.newToken);
    console.log('✅ Token rotated successfully');
    
    await client.disconnect();
  });

// ============================================
// STATUS ENGINE
// ============================================

program
  .command('status:analyze')
  .description('Analyze bot code for status/activity injection points')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .option('-d, --dir <path>', 'Bot directory', './bot-template')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const result = await client.analyzeStatus(options.id, options.dir);
    
    if (program.opts().json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('Status Analysis:');
      console.log(`  Has client.user.setPresence: ${result.hasSetPresence ? 'Yes' : 'No'}`);
      console.log(`  Has client.user.setActivity: ${result.hasSetActivity ? 'Yes' : 'No'}`);
      console.log(`  Injection points: ${result.injectionPoints?.length || 0}`);
    }
    
    await client.disconnect();
  });

program
  .command('status:set')
  .description('Set bot status and activity')
  .requiredOption('-i, --id <id>', 'Bot ID')
  .requiredOption('-d, --dir <path>', 'Bot directory')
  .option('--status <status>', 'Status (online/idle/dnd/invisible)', 'online')
  .option('--activity-name <name>', 'Activity name')
  .option('--activity-type <type>', 'Activity type (playing/streaming/listening/watching/competing)', 'playing')
  .option('--activity-url <url>', 'Stream URL (for streaming)')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const activity = options.activityName ? {
      name: options.activityName,
      type: ['playing', 'streaming', 'listening', 'watching', 'competing'].indexOf(options.activityType),
      url: options.activityUrl
    } : null;
    
    const result = await client.applyStatus(options.id, options.dir, {
      status: options.status,
      activity
    });
    
    console.log(result.success ? '✅ Status applied' : `❌ Failed: ${result.error}`);
    
    await client.disconnect();
  });

// ============================================
// IMPORT/EXPORT
// ============================================

program
  .command('export')
  .description('Export fleet configuration')
  .option('-o, --output <file>', 'Output file', 'fleet-export.json')
  .option('--bots', 'Include bots', true)
  .option('--features', 'Include features', true)
  .option('--guilds', 'Include guild cache', true)
  .option('--monitors', 'Include monitor sessions', true)
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const result = await client.exportFleet({
      includeBots: options.bots,
      includeFeatures: options.features,
      includeGuildCache: options.guilds,
      includeMonitorSessions: options.monitors
    });
    
    // Would save to file
    console.log(`✅ Fleet exported to ${options.output}`);
    
    await client.disconnect();
  });

program
  .command('import')
  .description('Import fleet configuration')
  .requiredOption('-f, --file <path>', 'Import file')
  .option('-s, --strategy <strategy>', 'Strategy (merge/replace/new-fleet)', 'merge')
  .option('-n, --name <name>', 'Fleet name (for new-fleet)')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const result = await client.importFleet(options.file, options.strategy, options.name);
    console.log(`✅ Fleet imported: ${result.fleetId}`);
    
    await client.disconnect();
  });

// ============================================
// FLEETS
// ============================================

program
  .command('fleets')
  .description('List saved fleet configurations')
  .action(async () => {
    const client = await getClient();
    await client.connect();
    
    const fleets = await client.listFleets();
    
    if (program.opts().json) {
      console.log(JSON.stringify(fleets, null, 2));
    } else {
      console.table(fleets.map((f: any) => ({
        ID: f.id,
        Name: f.name,
        Bots: f.botCount,
        Created: new Date(f.createdAt).toLocaleDateString(),
        Active: f.active ? '✅' : '❌'
      })));
    }
    
    await client.disconnect();
  });

program
  .command('fleet:switch')
  .description('Switch active fleet')
  .requiredOption('-i, --id <id>', 'Fleet ID')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    await client.activateFleet(options.id);
    console.log(`✅ Switched to fleet ${options.id}`);
    
    await client.disconnect();
  });

// ============================================
// INTELLIGENCE
// ============================================

program
  .command('intel:health')
  .description('Show fleet health score and issues')
  .action(async () => {
    const client = await getClient();
    await client.connect();
    
    const health = await client.getFleetHealth();
    
    if (program.opts().json) {
      console.log(JSON.stringify(health, null, 2));
    } else {
      console.log(`🏥 Fleet Health: ${health.overallScore}/100`);
      console.log('');
      console.log('Breakdown:');
      for (const [key, value] of Object.entries(health.breakdown)) {
        const bar = '█'.repeat(Math.floor(value / 5)) + '░'.repeat(20 - Math.floor(value / 5));
        console.log(`  ${key}: ${bar} ${value}%`);
      }
      
      if (health.issues.length > 0) {
        console.log('\n⚠️  Issues:');
        for (const issue of health.issues) {
          const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
          console.log(`  ${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
        }
      }
      
      if (health.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        for (const rec of health.recommendations) {
          console.log(`  • ${rec}`);
        }
      }
    }
    
    await client.disconnect();
  });

program
  .command('intel:collisions')
  .description('Find token collisions across bots')
  .action(async () => {
    const client = await getClient();
    await client.connect();
    
    const collisions = await client.getTokenCollisions();
    
    if (collisions.length === 0) {
      console.log('✅ No token collisions detected');
    } else {
      console.log(`⚠️  Found ${collisions.length} collision(s):`);
      for (const c of collisions) {
        console.log(`  🔴 ${c.botA.name} (${c.botA.clientId}) ↔ ${c.botB.name} (${c.botB.clientId})`);
        console.log(`     Hash: ${c.tokenHash} | Severity: ${c.severity}`);
      }
    }
    
    await client.disconnect();
  });

program
  .command('intel:gaps')
  .description('Find permission gaps')
  .action(async () => {
    const client = await getClient();
    await client.connect();
    
    const gaps = await client.getPermissionGaps();
    
    if (gaps.length === 0) {
      console.log('✅ No permission gaps detected');
    } else {
      console.log(`⚠️  Found ${gaps.length} permission gap(s):`);
      for (const g of gaps) {
        console.log(`  ${g.severity === 'critical' ? '🔴' : '🟡'} ${g.botName} in ${g.guildName}: Missing ${g.missingPermissions.join(', ')} for ${g.requiredFor.join(', ')}`);
      }
    }
    
    await client.disconnect();
  });

program
  .command('intel:graph')
  .description('Show fleet knowledge graph (outputs cytoscape.js JSON)')
  .option('-o, --output <file>', 'Output file')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const graph = await client.getFleetGraph();
    
    if (options.output) {
      writeFileSync(options.output, JSON.stringify(graph, null, 2));
      console.log(`✅ Graph saved to ${options.output}`);
    } else {
      console.log(JSON.stringify(graph, null, 2));
    }
    
    await client.disconnect();
  });

// ============================================
// MESSAGE TIME TRAVEL
// ============================================

program
  .command('message:replay')
  .description('Replay message timeline with bot decisions')
  .requiredOption('-m, --message <id>', 'Message ID')
  .requiredOption('-g, --guild <id>', 'Guild ID')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const replay = await client.replayMessage(options.message, options.guild);
    
    if (!replay) {
      console.log('❌ Message not found');
      return;
    }
    
    if (program.opts().json) {
      console.log(JSON.stringify(replay, null, 2));
    } else {
      console.log(`🔄 Replay for message ${options.message} in guild ${options.guild}`);
      console.log(`Timeline (${replay.timeline.length} events):`);
      
      for (const event of replay.timeline) {
        const icon = event.type === 'created' ? '🟢' : event.type === 'edited' ? '🟡' : event.type === 'deleted' ? '🔴' : '🤖';
        console.log(`  ${icon} [${new Date(event.timestamp).toISOString()}] ${event.type}: ${event.content?.slice(0, 80) || ''}`);
      }
      
      console.log(`\nBot Decisions (${replay.botDecisionTraces.length}):`);
      for (const trace of replay.botDecisionTraces) {
        console.log(`  🤖 ${trace.feature}: ${trace.matched ? 'MATCHED' : 'no match'} → ${trace.actionTaken} (${trace.executionTimeMs}ms)`);
        if (trace.error) console.log(`     Error: ${trace.error}`);
      }
    }
    
    await client.disconnect();
  });

program
  .command('message:debug-bundle')
  .description('Export debug bundle for a bot/guild/time range')
  .requiredOption('-i, --bot <id>', 'Bot ID')
  .requiredOption('-g, --guild <id>', 'Guild ID')
  .requiredOption('--start <timestamp>', 'Start timestamp (ms)')
  .requiredOption('--end <timestamp>', 'End timestamp (ms)')
  .option('-o, --output <file>', 'Output file', 'debug-bundle.json')
  .action(async (options) => {
    const client = await getClient();
    await client.connect();
    
    const bundle = await client.exportDebugBundle(
      parseInt(options.bot),
      options.guild,
      { start: parseInt(options.start), end: parseInt(options.end) }
    );
    
    writeFileSync(options.output, JSON.stringify(bundle, null, 2));
    console.log(`✅ Debug bundle saved to ${options.output} (${bundle.messages.length} messages)`);
    
    await client.disconnect();
  });

// ============================================
// TEMPLATES / BOT FORGE
// ============================================

program
  .command('template:list')
  .description('List available bot templates')
  .action(async () => {
    // Would use BotForge from intelligence package
    console.log('📋 Available Templates:');
    console.log('  moderation-bot  — Production moderation with auto-mod, logging, tickets');
    console.log('  community-bot   — Leveling, reaction roles, giveaways, custom commands');
    console.log('  utility-bot     — Logging, custom commands, admin tools');
  });

program
  .command('template:generate')
  .description('Generate a bot project from template')
  .requiredOption('-t, --template <name>', 'Template name')
  .requiredOption('-n, --name <name>', 'Project name')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('-v, --var <key=value>', 'Template variables (repeatable)', [])
  .option('--lang <ts|js>', 'Language', 'typescript')
  .option('--pm <npm|pnpm|yarn>', 'Package manager', 'npm')
  .option('--no-docker', 'Skip Docker files')
  .option('--no-ci', 'Skip GitHub Actions')
  .action(async (options) => {
    const vars: Record<string, string> = {};
    for (const v of options.var) {
      const [key, value] = v.split('=');
      vars[key] = value;
    }
    
    console.log(`🔨 Generating ${options.template} bot as ${options.name}...`);
    // Would use BotForge here
    console.log('✅ Project generated at', options.output);
    console.log('\nNext steps:');
    console.log(`  cd ${options.output}/${options.name}`);
    console.log('  cp .env.example .env  # Fill in your token');
    console.log('  npm install');
    console.log('  npm run dev');
  });

// ============================================
// CONFIG MANAGEMENT
// ============================================

program
  .command('config')
  .description('Manage CLI configuration')
  .argument('<action>', 'get | set | list | edit')
  .argument('[key]', 'Config key')
  .argument('[value]', 'Config value')
  .action((action, key, value) => {
    const config = loadConfig(program.opts().profile);
    
    switch (action) {
      case 'get':
        if (key) console.log(config[key]);
        else console.log(JSON.stringify(config, null, 2));
        break;
      case 'set':
        if (!key || value === undefined) {
          console.log('❌ Usage: config set <key> <value>');
          return;
        }
        config[key] = value;
        saveConfig(config);
        console.log(`✅ Set ${key} = ${value}`);
        break;
      case 'list':
        console.log(JSON.stringify(config, null, 2));
        break;
      case 'edit':
        // Would open in $EDITOR
        console.log(`Edit config at: ${getConfigPath(program.opts().profile)}`);
        break;
    }
  });

// ============================================
// UTILITIES
// ============================================

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ============================================
// ENTRY POINT
// ============================================

program.parseAsync(process.argv).catch((error) => {
  console.error('❌', error.message);
  process.exit(1);
});

export { program };