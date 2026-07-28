// Shared constants
export const FLEET_VERSION = '0.0.1';
export const FLEET_NAME = 'Discord Fleet Manager';
export const FLEET_DESCRIPTION = 'Intelligent Discord bot fleet manager';

export const DEFAULT_PORT = 3000;
export const DEFAULT_DB_PATH = './data/fleet.db';
export const DEFAULT_CONFIG_PATH = './config.yaml';

export const FEATURES = [
  'message_logger',
  'welcome_system',
  'auto_mod',
  'reaction_roles',
  'leveling_system',
  'ticket_system',
  'custom_commands',
  'admin_logging',
  'voice_activity',
  'giveaway_system'
] as const;

export type FeatureName = typeof FEATURES[number];

export const FEATURE_DISPLAY_NAMES: Record<FeatureName, string> = {
  message_logger: 'Message Logger',
  welcome_system: 'Welcome System',
  auto_mod: 'Auto Moderation',
  reaction_roles: 'Reaction Roles',
  leveling_system: 'Leveling System',
  ticket_system: 'Ticket System',
  custom_commands: 'Custom Commands',
  admin_logging: 'Admin Logging',
  voice_activity: 'Voice Activity',
  giveaway_system: 'Giveaway System'
};

export const FEATURE_DESCRIPTIONS: Record<FeatureName, string> = {
  message_logger: 'Real-time message monitoring with edit/delete tracking',
  welcome_system: 'Custom welcome messages and DM on join',
  auto_mod: 'Automated moderation rules and actions',
  reaction_roles: 'Self-serve role assignment via reactions',
  leveling_system: 'XP tracking, levels, and leaderboards',
  ticket_system: 'Support ticket creation and management',
  custom_commands: 'Create custom slash and prefix commands',
  admin_logging: 'Audit log for administrative actions',
  voice_activity: 'Voice channel join/leave/move tracking',
  giveaway_system: 'Create and manage giveaways'
};

export const FEATURE_REQUIRED_PERMISSIONS: Record<FeatureName, string[]> = {
  message_logger: ['ViewChannel', 'ReadMessageHistory'],
  welcome_system: ['SendMessages', 'EmbedLinks'],
  auto_mod: ['ManageMessages', 'KickMembers', 'BanMembers', 'ViewAuditLog'],
  reaction_roles: ['ManageRoles', 'AddReactions'],
  leveling_system: ['SendMessages', 'EmbedLinks'],
  ticket_system: ['ManageChannels', 'ManageRoles', 'ViewChannel'],
  custom_commands: ['SendMessages', 'EmbedLinks'],
  admin_logging: ['ViewAuditLog'],
  voice_activity: ['Connect', 'Speak', 'MuteMembers', 'DeafenMembers'],
  giveaway_system: ['ManageMessages', 'AddReactions', 'ReadMessageHistory']
};

export const BOT_STATUSES = ['online', 'offline', 'starting', 'error', 'restarting'] as const;
export type BotStatus = typeof BOT_STATUSES[number];

export const MONITOR_EVENTS = ['message', 'edit', 'delete', 'bulk_delete'] as const;
export type MonitorEvent = typeof MONITOR_EVENTS[number];

export const WS_MESSAGE_TYPES = [
  'connected',
  'bot_status',
  'bot_log',
  'monitor_message',
  'monitor_stats',
  'monitor_channel_list',
  'fleet_health',
  'intelligence_update',
  'error'
] as const;
export type WSMessageType = typeof WS_MESSAGE_TYPES[number];

// Platform detection
export const PLATFORMS = ['linux', 'darwin', 'win32', 'android'] as const;
export type Platform = typeof PLATFORMS[number];

export function detectPlatform(): Platform {
  const platform = process.platform;
  if (platform === 'linux') {
    // Check for Termux
    if (process.env.TERMUX_VERSION || process.env.PREFIX?.includes('com.termux')) {
      return 'android';
    }
    return 'linux';
  }
  if (platform === 'darwin') return 'darwin';
  if (platform === 'win32') return 'win32';
  return 'linux';
}

export function getPlatformConfig(platform: Platform): {
  serviceManager: 'systemd' | 'launchd' | 'windows-service' | 'termux';
  dataDir: string;
  configDir: string;
  logDir: string;
  executableName: string;
} {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
  
  switch (platform) {
    case 'linux':
      return {
        serviceManager: 'systemd',
        dataDir: '/var/lib/discord-fleet-manager',
        configDir: '/etc/discord-fleet-manager',
        logDir: '/var/log/discord-fleet-manager',
        executableName: 'discord-fleet-manager'
      };
    case 'darwin':
      return {
        serviceManager: 'launchd',
        dataDir: `${homeDir}/Library/Application Support/DiscordFleetManager`,
        configDir: `${homeDir}/Library/Preferences`,
        logDir: `${homeDir}/Library/Logs/DiscordFleetManager`,
        executableName: 'discord-fleet-manager'
      };
    case 'win32':
      return {
        serviceManager: 'windows-service',
        dataDir: `${process.env.PROGRAMDATA || 'C:\\ProgramData'}\\DiscordFleetManager`,
        configDir: `${process.env.PROGRAMDATA || 'C:\\ProgramData'}\\DiscordFleetManager`,
        logDir: `${process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'}\\DiscordFleetManager\\Logs`,
        executableName: 'discord-fleet-manager.exe'
      };
    case 'android':
      return {
        serviceManager: 'termux',
        dataDir: `${process.env.PREFIX || '/data/data/com.termux/files/usr'}/var/lib/discord-fleet-manager`,
        configDir: `${process.env.PREFIX || '/data/data/com.termux/files/usr'}/etc/discord-fleet-manager`,
        logDir: `${process.env.PREFIX || '/data/data/com.termux/files/usr'}/var/log/discord-fleet-manager`,
        executableName: 'discord-fleet-manager'
      };
  }
}

export function getInstallCommands(platform: Platform): string[] {
  const config = getPlatformConfig(platform);
  const baseUrl = 'https://github.com/phantom1785322-hub/Discord-Fleet-Manager/releases/latest/download';
  
  switch (platform) {
    case 'linux':
      return [
        `# Install via package manager (recommended)`,
        `curl -fsSL https://raw.githubusercontent.com/phantom1785322-hub/Discord-Fleet-Manager/main/scripts/install-linux.sh | bash`,
        ``,
        `# Or manual install:`,
        `sudo mkdir -p ${config.dataDir} ${config.configDir} ${config.logDir}`,
        `sudo wget -O /usr/local/bin/${config.executableName} ${baseUrl}/${config.executableName}-linux-amd64`,
        `sudo chmod +x /usr/local/bin/${config.executableName}`,
        `sudo systemctl enable --now discord-fleet-manager`
      ];
    case 'darwin':
      return [
        `# Install via Homebrew (recommended)`,
        `brew tap phantom1785322-hub/fleet && brew install discord-fleet-manager`,
        ``,
        `# Or manual install:`,
        `mkdir -p "${config.dataDir}" "${config.configDir}" "${config.logDir}"`,
        `curl -L -o /usr/local/bin/${config.executableName} ${baseUrl}/${config.executableName}-darwin-amd64`,
        `chmod +x /usr/local/bin/${config.executableName}`,
        `brew services start discord-fleet-manager`
      ];
    case 'win32':
      return [
        `# Install via Scoop (recommended)`,
        `scoop bucket add phantom https://github.com/phantom1785322-hub/scoop-bucket && scoop install discord-fleet-manager`,
        ``,
        `# Or manual install (PowerShell as Admin):`,
        `$dataDir = "${config.dataDir}"; $configDir = "${config.configDir}"; $logDir = "${config.logDir}"`,
        `New-Item -ItemType Directory -Force -Path $dataDir, $configDir, $logDir`,
        `Invoke-WebRequest -Uri "${baseUrl}/${config.executableName}-windows-amd64.exe" -OutFile "C:\\Program Files\\DiscordFleetManager\\${config.executableName}"`,
        `Set-Service -Name "DiscordFleetManager" -StartupType Automatic`,
        `Start-Service "DiscordFleetManager"`
      ];
    case 'android':
      return [
        `# Install in Termux:`,
        `pkg update && pkg install -y nodejs-lts git`,
        `git clone https://github.com/phantom1785322-hub/Discord-Fleet-Manager`,
        `cd Discord-Fleet-Manager && npm install`,
        `termux-wake-lock`,
        `npm start`
      ];
  }
}