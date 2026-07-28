export interface Bot {
  id: number;
  name: string;
  token_encrypted: string;
  client_id: string | null;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'starting' | 'error';
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
  config: Record<string, unknown>;
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
  attachments?: unknown[];
  embeds?: unknown[];
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
  guild_name?: string;
  guild_icon?: string;
  member_count?: number;
  bot_nickname?: string;
  bot_permissions?: string;
}

export interface BotWithFeatures extends Bot {
  features: Feature[];
}

export interface BotWithPreview extends Omit<Bot, 'token_encrypted'> {
  token_preview: string | null;
  uptime: number;
}