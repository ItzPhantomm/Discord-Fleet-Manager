import { Database } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import type { 
  Bot, 
  Feature, 
  MonitorSession, 
  Message, 
  GuildCache,
  BotInsert,
  FeatureInsert,
  MonitorSessionInsert,
  MessageInsert,
  GuildCacheInsert
} from '../types/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'fleet.db');

let db: Database | null = null;

export function getDB(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function init(): void {
  const d = getDB();
  d.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      token_encrypted TEXT NOT NULL,
      client_id TEXT,
      avatar_url TEXT,
      status TEXT DEFAULT 'offline',
      uptime_started INTEGER,
      pid INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    CREATE TABLE IF NOT EXISTS features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER NOT NULL,
      feature_name TEXT NOT NULL,
      enabled INTEGER DEFAULT 0,
      config TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(bot_id, feature_name)
    );
    CREATE TABLE IF NOT EXISTS monitor_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      guild_name TEXT,
      guild_icon TEXT,
      bot_id INTEGER NOT NULL,
      active INTEGER DEFAULT 1,
      started_at INTEGER DEFAULT (strftime('%s', 'now')),
      stopped_at INTEGER,
      message_count INTEGER DEFAULT 0,
      edit_count INTEGER DEFAULT 0,
      delete_count INTEGER DEFAULT 0,
      ws_client_id TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_msg_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_name TEXT,
      author_id TEXT NOT NULL,
      author_name TEXT,
      author_avatar TEXT,
      author_discriminator TEXT,
      content TEXT,
      content_edited TEXT,
      is_deleted INTEGER DEFAULT 0,
      deleted_at INTEGER,
      attachments_json TEXT DEFAULT '[]',
      embeds_json TEXT DEFAULT '[]',
      timestamp INTEGER DEFAULT (strftime('%s', 'now')),
      monitor_session_id INTEGER NOT NULL,
      message_type TEXT DEFAULT 'default'
    );
    CREATE TABLE IF NOT EXISTS guild_cache (
      guild_id TEXT NOT NULL,
      bot_id INTEGER NOT NULL,
      guild_name TEXT,
      guild_icon TEXT,
      member_count INTEGER,
      bot_nickname TEXT,
      bot_permissions TEXT,
      cached_at INTEGER DEFAULT (strftime('%s', 'now')),
      PRIMARY KEY (guild_id, bot_id)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_guild ON messages(guild_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(monitor_session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_features_bot ON features(bot_id);
    CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
    CREATE INDEX IF NOT EXISTS idx_monitor_sessions_bot ON monitor_sessions(bot_id);
  `);
  console.log('[PHANTOM] Database initialized at', DB_PATH);
}

// Bot CRUD
export function addBot(data: BotInsert): number {
  const stmt = getDB().prepare('INSERT INTO bots (name, token_encrypted) VALUES (?, ?)');
  const result = stmt.run(data.name, data.token_encrypted);
  return result.lastInsertRowid as number;
}

export function getBots(): Bot[] {
  return getDB().prepare('SELECT * FROM bots ORDER BY created_at DESC').all() as Bot[];
}

export function getBot(id: number): Bot | undefined {
  return getDB().prepare('SELECT * FROM bots WHERE id = ?').get(id) as Bot | undefined;
}

export function updateBotStatus(id: number, status: string, pid: number | null, uptime: number | null): void {
  getDB().prepare('UPDATE bots SET status = ?, pid = ?, uptime_started = ?, updated_at = ? WHERE id = ?')
    .run(status, pid, uptime, Date.now(), id);
}

export function deleteBot(id: number): void {
  getDB().prepare('DELETE FROM bots WHERE id = ?').run(id);
  getDB().prepare('DELETE FROM features WHERE bot_id = ?').run(id);
}

// Features
export function setFeature(data: FeatureInsert): void {
  getDB().prepare(`
    INSERT INTO features (bot_id, feature_name, enabled, config) 
    VALUES (?, ?, ?, ?) 
    ON CONFLICT(bot_id, feature_name) DO UPDATE SET 
      enabled = excluded.enabled, 
      config = excluded.config
  `).run(data.bot_id, data.feature_name, data.enabled ? 1 : 0, JSON.stringify(data.config || {}));
}

export function getFeatures(botId: number): Feature[] {
  return getDB().prepare('SELECT * FROM features WHERE bot_id = ?').all(botId) as Feature[];
}

export function getFeature(botId: number, featureName: string): Feature | undefined {
  return getDB().prepare('SELECT * FROM features WHERE bot_id = ? AND feature_name = ?').get(botId, featureName) as Feature | undefined;
}

// Monitor Sessions
export function createMonitorSession(data: MonitorSessionInsert): number {
  const stmt = getDB().prepare('INSERT INTO monitor_sessions (guild_id, guild_name, guild_icon, bot_id, active) VALUES (?, ?, ?, ?, 1)');
  const result = stmt.run(data.guild_id, data.guild_name, data.guild_icon, data.bot_id);
  return result.lastInsertRowid as number;
}

export function getActiveMonitorSession(guildId: string): MonitorSession | undefined {
  return getDB().prepare('SELECT * FROM monitor_sessions WHERE guild_id = ? AND active = 1').get(guildId) as MonitorSession | undefined;
}

export function stopMonitorSession(id: number): void {
  getDB().prepare('UPDATE monitor_sessions SET active = 0, stopped_at = ? WHERE id = ?').run(Date.now(), id);
}

export function updateMonitorStats(id: number, field: 'message' | 'edit' | 'delete'): void {
  const col = field === 'message' ? 'message_count' : field === 'edit' ? 'edit_count' : 'delete_count';
  getDB().prepare(`UPDATE monitor_sessions SET ${col} = ${col} + 1 WHERE id = ?`).run(id);
}

// Messages
export function insertMessage(data: MessageInsert): number {
  const stmt = getDB().prepare(`
    INSERT INTO messages 
    (discord_msg_id, guild_id, channel_id, channel_name, author_id, author_name, author_avatar, author_discriminator, content, attachments_json, embeds_json, monitor_session_id, message_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.discord_msg_id,
    data.guild_id,
    data.channel_id,
    data.channel_name || '',
    data.author_id,
    data.author_name,
    data.author_avatar,
    data.author_discriminator,
    data.content,
    JSON.stringify(data.attachments || []),
    JSON.stringify(data.embeds || []),
    data.monitor_session_id,
    data.message_type || 'default'
  );
  return result.lastInsertRowid as number;
}

export function updateMessageEdit(msgId: string, newContent: string, oldContent: string): void {
  getDB().prepare('UPDATE messages SET content_edited = ?, content = ? WHERE discord_msg_id = ?').run(oldContent, newContent, msgId);
}

export function markMessageDeleted(msgId: string): void {
  getDB().prepare('UPDATE messages SET is_deleted = 1, deleted_at = ? WHERE discord_msg_id = ?').run(Date.now(), msgId);
}

export function getMessages(sessionId: number, limit = 50, offset = 0): Message[] {
  return getDB().prepare('SELECT * FROM messages WHERE monitor_session_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(sessionId, limit, offset) as Message[];
}

export function getMessageCount(sessionId: number): number {
  const row = getDB().prepare('SELECT COUNT(*) as count FROM messages WHERE monitor_session_id = ?').get(sessionId) as { count: number } | undefined;
  return row?.count || 0;
}

// Guild Cache
export function cacheGuild(data: GuildCacheInsert): void {
  getDB().prepare(`
    INSERT INTO guild_cache (guild_id, bot_id, guild_name, guild_icon, member_count, bot_nickname, bot_permissions, cached_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(guild_id, bot_id) DO UPDATE SET
      guild_name = excluded.guild_name,
      guild_icon = excluded.guild_icon,
      member_count = excluded.member_count,
      bot_nickname = excluded.bot_nickname,
      bot_permissions = excluded.bot_permissions,
      cached_at = excluded.cached_at
  `).run(data.guild_id, data.bot_id, data.guild_name, data.guild_icon, data.member_count, data.bot_nickname, data.bot_permissions, Date.now());
}

export function getGuildCache(guildId: string): GuildCache[] {
  return getDB().prepare('SELECT * FROM guild_cache WHERE guild_id = ?').all(guildId) as GuildCache[];
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}