const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'fleet.db');
let db;

function getDB() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
    db.run('PRAGMA journal_mode = WAL');
  }
  return db;
}

function init() {
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
  `, (err) => {
    if (err) console.error('[PHANTOM] DB Init Error:', err);
    else console.log('[PHANTOM] Database initialized');
  });
}

// Promisified wrappers for sqlite3
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDB().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Bot CRUD
async function addBot(name, tokenEncrypted) {
  const result = await run('INSERT INTO bots (name, token_encrypted) VALUES (?, ?)', [name, tokenEncrypted]);
  return result.lastID;
}

async function getBots() { return all('SELECT * FROM bots ORDER BY created_at DESC'); }
async function getBot(id) { return get('SELECT * FROM bots WHERE id = ?', [id]); }

async function updateBotStatus(id, status, pid, uptime) {
  await run('UPDATE bots SET status = ?, pid = ?, uptime_started = ?, updated_at = ? WHERE id = ?', [status, pid || null, uptime || null, Date.now(), id]);
}

async function deleteBot(id) {
  await run('DELETE FROM bots WHERE id = ?', [id]);
  await run('DELETE FROM features WHERE bot_id = ?', [id]);
}

// Features
async function setFeature(botId, featureName, enabled, config) {
  await run(`INSERT INTO features (bot_id, feature_name, enabled, config) VALUES (?, ?, ?, ?) ON CONFLICT(bot_id, feature_name) DO UPDATE SET enabled = excluded.enabled, config = excluded.config`, [botId, featureName, enabled ? 1 : 0, JSON.stringify(config || {})]);
}

async function getFeatures(botId) { return await all('SELECT * FROM features WHERE bot_id = ?', [botId]); }
async function getFeature(botId, featureName) { return await get('SELECT * FROM features WHERE bot_id = ? AND feature_name = ?', [botId, featureName]); }

// Monitor Sessions
async function createMonitorSession(guildId, guildName, guildIcon, botId) {
  const result = await run('INSERT INTO monitor_sessions (guild_id, guild_name, guild_icon, bot_id, active) VALUES (?, ?, ?, ?, 1)', [guildId, guildName, guildIcon, botId]);
  return result.lastID;
}

async function getActiveMonitorSession(guildId) { return await get('SELECT * FROM monitor_sessions WHERE guild_id = ? AND active = 1', [guildId]); }

async function stopMonitorSession(id) {
  await run('UPDATE monitor_sessions SET active = 0, stopped_at = ? WHERE id = ?', [Date.now(), id]);
}

async function updateMonitorStats(id, field) {
  if (field === 'message') await run('UPDATE monitor_sessions SET message_count = message_count + 1 WHERE id = ?', [id]);
  if (field === 'edit') await run('UPDATE monitor_sessions SET edit_count = edit_count + 1 WHERE id = ?', [id]);
  if (field === 'delete') await run('UPDATE monitor_sessions SET delete_count = delete_count + 1 WHERE id = ?', [id]);
}

// Messages
async function insertMessage(msg) {
  const result = await run(`INSERT INTO messages (discord_msg_id, guild_id, channel_id, channel_name, author_id, author_name, author_avatar, author_discriminator, content, attachments_json, embeds_json, monitor_session_id, message_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [msg.discord_msg_id, msg.guild_id, msg.channel_id, msg.channel_name || '', msg.author_id, msg.author_name, msg.author_avatar, msg.author_discriminator, msg.content, JSON.stringify(msg.attachments || []), JSON.stringify(msg.embeds || []), msg.monitor_session_id, msg.message_type || 'default']);
  return result.lastID;
}

async function updateMessageEdit(msgId, newContent, oldContent) {
  await run('UPDATE messages SET content_edited = ?, content = ? WHERE discord_msg_id = ?', [oldContent, newContent, msgId]);
}

async function markMessageDeleted(msgId) {
  await run('UPDATE messages SET is_deleted = 1, deleted_at = ? WHERE discord_msg_id = ?', [Date.now(), msgId]);
}

async function getMessages(sessionId, limit = 50, offset = 0) {
  return await all('SELECT * FROM messages WHERE monitor_session_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?', [sessionId, limit, offset]);
}

async function getMessageCount(sessionId) {
  const row = await get('SELECT COUNT(*) as count FROM messages WHERE monitor_session_id = ?', [sessionId]);
  return row ? row.count : 0;
}

// Guild Cache
async function cacheGuild(guildId, botId, data) {
  await run(`INSERT INTO guild_cache (guild_id, bot_id, guild_name, guild_icon, member_count, bot_nickname, bot_permissions, cached_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(guild_id, bot_id) DO UPDATE SET guild_name = excluded.guild_name, guild_icon = excluded.guild_icon, member_count = excluded.member_count, bot_nickname = excluded.bot_nickname, bot_permissions = excluded.bot_permissions, cached_at = excluded.cached_at`, [guildId, botId, data.name, data.icon, data.member_count, data.bot_nickname, data.bot_permissions, Date.now()]);
}

async function getGuildCache(guildId) { return await all('SELECT * FROM guild_cache WHERE guild_id = ?', [guildId]); }

module.exports = {
  init, getDB,
  addBot, getBots, getBot, updateBotStatus, deleteBot,
  setFeature, getFeatures, getFeature,
  createMonitorSession, getActiveMonitorSession, stopMonitorSession, updateMonitorStats,
  insertMessage, updateMessageEdit, markMessageDeleted, getMessages, getMessageCount,
  cacheGuild, getGuildCache
};
