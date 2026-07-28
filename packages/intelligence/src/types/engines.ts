import type { BotNode, GuildNode, Edge, FleetGraph } from './intelligence.js';

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
  type: 'token_collision' | 'permission_gap' | 'offline_bot' | 'unused_feature' | 'config_drift' | 'exposed_dashboard';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  affectedBots: number[];
  affectedGuilds: string[];
  fixable: boolean;
  autoFix?: () => Promise<void>;
}

export interface AttackSurface {
  exposedTokens: number;
  overPermissionedBots: number;
  publicDashboards: number;
  unencryptedSecrets: number;
  staleTokens: number;
  details: {
    exposedTokens: { botId: number; botName: string; reason: string }[];
    overPermissionedBots: { botId: number; botName: string; guildId: string; excessPermissions: string[] }[];
    publicDashboards: { url: string; botId: number }[];
    unencryptedSecrets: number;
    staleTokens: { botId: number; botName: string; lastRotated: number }[];
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

export interface ConfigDrift {
  templateName: string;
  botId: number;
  botName: string;
  feature: string;
  expected: unknown;
  actual: unknown;
  diff: string;
}

// Engine Types
export interface RotationPolicy {
  schedule: string; // "daily", "weekly", "monthly", or cron
  gracePeriod?: number; // ms overlap for zero-downtime
  notify?: string[]; // ["discord", "email", "webhook"]
  autoApprove?: boolean; // false = require manual approval
  tokenGenerator?: (bot: any) => Promise<string>; // Optional: generate token programmatically
}

export interface RotationResult {
  success: boolean;
  botId?: number;
  clientId?: string;
  method?: 'hot_swap' | 'restart';
  downtimeMs?: number;
  error?: string;
}

export interface RevokeResult {
  success: boolean;
  revoked: number[];
  errors: { botId: number; error: string }[];
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

export interface TemplateConfig {
  name: string;
  description: string;
  version: string;
  extends?: string;
  features: Record<string, FeatureTemplate>;
  permissions: {
    required: string[];
    recommended: string[];
  };
  variables: Record<string, VariableTemplate>;
  files: Record<string, string>; // path -> template content
}

export interface FeatureTemplate {
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface VariableTemplate {
  type: 'string' | 'number' | 'boolean' | 'channel' | 'role' | 'guild';
  description: string;
  default?: unknown;
  required: boolean;
}

export interface GeneratedBotProject {
  name: string;
  path: string;
  structure: string[];
  files: Record<string, string>;
  packageJson: any;
  tsconfigJson: any;
  dockerfile: string;
  dockerCompose: string;
  githubWorkflow: string;
  readme: string;
}