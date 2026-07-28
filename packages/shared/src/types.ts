// Database types
export interface Bot {
  id: number;
  name: string;
  token_encrypted: string;
  client_id: string | null;
  avatar_url: string | null;
  status: string;
  uptime_started: number | null;
  pid: number | null;
  created_at: number;
  updated_at: number;
}

export interface BotInsert {
  name: string;
  token_encrypted: string;
}

export interface Feature {
  id: number;
  bot_id: number;
  feature_name: string;
  enabled: number;
  config: string;
  created_at: number;
}

export interface FeatureInsert {
  bot_id: number;
  feature_name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface MonitorSession {
  id: number;
  guild_id: string;
  guild_name: string | null;
  guild_icon: string | null;
  bot_id: number;
  active: number;
  started_at: number;
  stopped_at: number | null;
  message_count: number;
  edit_count: number;
  delete_count: number;
  ws_client_id: string | null;
}

export interface MonitorSessionInsert {
  guild_id: string;
  guild_name: string | null;
  guild_icon: string | null;
  bot_id: number;
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
  is_deleted: number;
  deleted_at: number | null;
  attachments_json: string;
  embeds_json: string;
  timestamp: number;
  monitor_session_id: number;
  message_type: string;
}

export interface MessageInsert {
  discord_msg_id: string;
  guild_id: string;
  channel_id: string;
  channel_name?: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  author_discriminator?: string;
  content?: string;
  attachments?: any[];
  embeds?: any[];
  monitor_session_id: number;
  message_type?: string;
}

export interface GuildCache {
  guild_id: string;
  bot_id: number;
  guild_name: string | null;
  guild_icon: string | null;
  member_count: number | null;
  bot_nickname: string | null;
  bot_permissions: string | null;
  cached_at: number;
}

export interface GuildCacheInsert {
  guild_id: string;
  bot_id: number;
  name: string;
  icon: string | null;
  member_count: number;
  bot_nickname: string | null;
  bot_permissions: string;
}

// API types
export interface BotWithPreview extends Omit<Bot, 'token_encrypted'> {
  token_preview: string | null;
  uptime: number;
  features: Feature[];
}

export interface CreateBotRequest {
  name: string;
  token: string;
}

export interface UpdateBotRequest {
  name?: string;
}

export interface StartBotRequest {
  templatePath?: string;
}

export interface FeatureToggleRequest {
  enabled: boolean;
  config?: Record<string, any>;
}

export interface ScanGuildRequest {
  guildId: string;
}

export interface MonitorStartRequest {
  guildId: string;
  botId: number;
}

export interface MonitorStopRequest {
  guildId: string;
}

export interface SendMessageRequest {
  channelId: string;
  content: string;
}

export interface TokenScanRequest {
  botDir: string;
}

export interface TokenReplaceRequest {
  filePath: string;
  oldToken: string;
  newToken: string;
}

export interface StatusAnalyzeRequest {
  botDir: string;
}

export interface StatusApplyRequest {
  status: string;
  activity: {
    name: string;
    type: number;
    url?: string;
  } | null;
}

export interface ExportRequest {
  includeBots: boolean;
  includeFeatures: boolean;
  includeGuildCache: boolean;
  includeMonitorSessions: boolean;
}

export interface ImportRequest {
  source: string; // file path or URL
  strategy: 'merge' | 'replace' | 'new-fleet';
  name?: string;
}

// Intelligence types
export interface FleetKnowledgeGraph {
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
  severity: 'critical' | 'warning';
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
  type: 'token_collision' | 'permission_gap' | 'offline_bot' | 'config_drift' | 'low_utilization';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  affectedBots: number[];
  affectedGuilds: string[];
  fixable: boolean;
}

export interface ConfigDrift {
  botId: number;
  botName: string;
  featureName: string;
  expectedConfig: Record<string, any>;
  actualConfig: Record<string, any>;
}

export interface AttackSurface {
  exposedTokens: number;
  overPermissionedBots: number;
  publicDashboards: number;
  unencryptedSecrets: number;
  staleTokens: number;
  details: {
    exposedTokens: any[];
    overPermissionedBots: any[];
    publicDashboards: any[];
    unencryptedSecrets: number;
    staleTokens: any[];
  };
}

export interface CostBreakdown {
  estimatedMonthlyApiCalls: number;
  estimatedShards: number;
  recommendedVpsTier: string;
  estimatedMonthlyCost: number;
  breakdown: {
    apiCalls: number;
    shards: number;
    vps: number;
    monitoring: number;
  };
}

// Error types
export class FleetError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'FleetError';
  }
}

export class ValidationError extends FleetError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends FleetError {
  constructor(resource: string, id: string | number) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends FleetError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends FleetError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends FleetError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

// WebSocket types
export interface WSMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
}

export interface WSBotStatusData {
  botId: number;
  status: string;
  pid?: number;
  uptime?: number;
}

export interface WSMonitorMessageData {
  sessionId: number;
  message: any;
}

export interface WSMonitorStatsData {
  sessionId: number;
  messageCount: number;
  editCount: number;
  deleteCount: number;
}

// CLI types
export interface CLIConfig {
  profile: string;
  apiUrl: string;
  token?: string;
}

export interface TemplateConfig {
  name: string;
  extends?: string;
  features: Record<string, { enabled: boolean; config: Record<string, any> }>;
  permissions: {
    required: string[];
    recommended: string[];
  };
  variables: Record<string, string>;
}

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
  sdk: any; // Will be typed when SDK is ready
  config: Record<string, any>;
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  };
}