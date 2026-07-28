// Types for the SDK
export interface FleetClientConfig {
  baseUrl: string;
  apiKey?: string;
  wsUrl?: string;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export interface Bot {
  id: number;
  name: string;
  client_id: string | null;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'starting' | 'error';
  uptime: number;
  features: BotFeature[];
}

export interface BotFeature {
  feature_name: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface Guild {
  id: string;
  name: string;
  icon: string | null;
  member_count: number;
  bot_nickname: string | null;
  bot_permissions: string[];
  is_admin: boolean;
}

export interface MonitorSession {
  id: number;
  guild_id: string;
  guild_name: string | null;
  bot_id: number;
  active: boolean;
  started_at: number;
  message_count: number;
  edit_count: number;
  delete_count: number;
}

export interface Message {
  id: number;
  discord_msg_id: string;
  guild_id: string;
  channel_id: string;
  channel_name: string | null;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  author_discriminator: string | null;
  content: string | null;
  content_edited: string | null;
  is_deleted: boolean;
  deleted_at: number | null;
  attachments: unknown[];
  embeds: unknown[];
  timestamp: number;
  monitor_session_id: number;
  message_type: string;
}

export interface FleetHealth {
  overallScore: number;
  breakdown: {
    tokenSecurity: number;
    permissionCoverage: number;
    uptime: number;
    featureUtilization: number;
    configConsistency: number;
  };
  issues: HealthIssue[];
  recommendations: string[];
}

export interface HealthIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  affectedBots: number[];
  affectedGuilds: string[];
  fixable: boolean;
}

export interface TokenCollision {
  botA: { id: number; name: string; clientId: string | null };
  botB: { id: number; name: string; clientId: string | null };
  tokenHash: string;
  severity: 'critical' | 'warning';
}

export interface PermissionGap {
  botId: number;
  botName: string;
  guildId: string;
  guildName: string;
  missingPermissions: string[];
  requiredFor: string[];
  severity: 'critical' | 'warning' | 'info';
}

export interface FleetGraph {
  bots: BotNode[];
  guilds: GuildNode[];
  edges: Edge[];
}

export interface BotNode {
  id: string;
  name: string;
  clientId: string | null;
  status: string;
  guildCount: number;
  tokenHash: string;
  healthScore: number;
}

export interface GuildNode {
  id: string;
  name: string;
  memberCount: number;
  botIds: string[];
  icon: string | null;
}

export interface Edge {
  source: string;
  target: string;
  type: 'membership' | 'token_shared' | 'permission_gap';
  weight: number;
}

export interface MessageReplay {
  messageId: string;
  guildId: string;
  channelId: string;
  timeline: MessageTimelineEvent[];
  botDecisionTraces: BotDecisionTrace[];
  exportable: boolean;
}

export interface MessageTimelineEvent {
  timestamp: number;
  type: 'created' | 'edited' | 'deleted' | 'bot_action';
  content?: string;
  oldContent?: string;
  authorId: string;
  authorName?: string;
  metadata?: Record<string, unknown>;
}

export interface BotDecisionTrace {
  feature: string;
  matched: boolean;
  conditions: { name: string; passed: boolean; reason?: string }[];
  executionTimeMs: number;
  actionTaken: string;
  error?: string;
  middlewareTimings: { name: string; timeMs: number }[];
}

export interface DebugBundle {
  sessionId: string;
  botId: number;
  guildId: string;
  timeRange: { start: number; end: number };
  messages: MessageReplay[];
  botConfig: Record<string, unknown>;
  systemInfo: {
    nodeVersion: string;
    platform: string;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
  generatedAt: number;
}

// Event types
export type FleetEvent = 
  | { type: 'bot_status'; data: { botId: number; status: string; pid?: number; uptime?: number } }
  | { type: 'bot_log'; data: { botId: number; log: string } }
  | { type: 'monitor_message'; data: { sessionId: number; message: Message } }
  | { type: 'monitor_stats'; data: { sessionId: number; messageCount: number; editCount: number; deleteCount: number } }
  | { type: 'fleet_health'; data: FleetHealth }
  | { type: 'intelligence_update'; data: { graph: FleetGraph; health: FleetHealth } }
  | { type: 'error'; data: { message: string; code: string } };

export type FleetEventType = FleetEvent['type'];

// Plugin types
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  main: string;
  features: string[];
  permissions: string[];
  minManagerVersion: string;
}

export interface PluginContext {
  client: FleetClient;
  config: Record<string, unknown>;
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
    debug: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

export interface Plugin {
  manifest: PluginManifest;
  install: (context: PluginContext) => Promise<void> | void;
  uninstall?: (context: PluginContext) => Promise<void> | void;
}

export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}