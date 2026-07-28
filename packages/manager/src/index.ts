import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { init as initDB, closeDB } from './database.js';
import { encrypt, decrypt, generateSecret, validateSecret } from './crypto.js';
import { BotRunner } from './bot-runner.js';
import { DiscordMonitor } from './discord-monitor.js';
import { loadFeatures } from './feature-registry.js';
import { SmartTokenReplacer } from './engines/smart-token-replacer.js';
import { StatusActivityEngine } from './engines/status-activity-engine.js';
import { ImportExportEngine } from './engines/import-export-engine.js';
import { FleetIntelligence } from './intelligence/index.js';
import { SmartTokenRotator } from './intelligence/token-rotator.js';
import { MessageTimeTravel } from './intelligence/message-time-travel.js';
import { BotForge } from './intelligence/bot-forge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DASHBOARD_PATH = path.join(__dirname, '..', '..', 'dashboard', 'dist');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize database
initDB();

// WebSocket clients
const wsClients = new Set<WebSocket>();

function broadcast(type: string, data: any) {
  const payload = JSON.stringify({ type, data, timestamp: Date.now() });
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}

// Initialize engines
const tokenReplacer = new SmartTokenReplacer();
const statusEngine = new StatusActivityEngine();
const importExport = new ImportExportEngine();

// Initialize intelligence engines (lazy-loaded when DB is ready)
// These will be initialized after DB init in routes

// Bot runner
const botRunner = new BotRunner();

// Discord monitor
const monitor = new DiscordMonitor();

// Set up monitor broadcast
monitor.setWSBroadcast(broadcast);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(DASHBOARD_PATH));

// WebSocket handling
wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', data: { message: 'Phantom Fleet Manager connected' } }));
  ws.on('close', () => wsClients.delete(ws));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), uptime: process.uptime() });
});

// ============================================
// BOT MANAGEMENT API
// ============================================

app.post('/api/bots', async (req, res) => {
  try {
    const { name, token } = req.body;
    if (!name || !token) return res.status(400).json({ error: 'Name and token required' });

    const { Client, GatewayIntentBits } = await import('discord.js');
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(token);
    const user = client.user;
    await client.destroy();

    const encrypted = encrypt(token);
    const db = await import('./database.js');
    const botId = await db.addBot(name, encrypted);

    const features = [
      'message_logger', 'welcome_system', 'auto_mod', 'reaction_roles',
      'leveling_system', 'ticket_system', 'custom_commands', 'admin_logging',
      'voice_activity', 'giveaway_system'
    ];
    for (const f of features) { await db.setFeature(botId, f, false, {}); }

    res.json({
      success: true,
      bot: {
        id: botId, name,
        client_id: user.id,
        avatar_url: user.displayAvatarURL({ size: 128 }),
        status: 'offline'
      }
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid token: ' + err.message });
  }
});

app.get('/api/bots', async (req, res) => {
  const db = await import('./database.js');
  const bots = await db.getBots();
  const decrypted = bots.map(b => {
    const token = decrypt(b.token_encrypted);
    return {
      ...b,
      token_encrypted: undefined,
      token_preview: token ? token.slice(0, 15) + '...' + token.slice(-5) : null,
      uptime: b.uptime_started ? Date.now() - b.uptime_started : 0
    };
  });
  res.json(decrypted);
});

app.delete('/api/bots/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  botRunner.stopBot(id);
  const db = await import('./database.js');
  await db.deleteBot(id);
  res.json({ success: true });
});

app.post('/api/bots/:id/start', async (req, res) => {
  const id = parseInt(req.params.id);
  const db = await import('./database.js');
  const bot = await db.getBot(id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  const token = decrypt(bot.token_encrypted);
  if (!token) return res.status(500).json({ error: 'Token decryption failed' });
  const templatePath = path.join(__dirname, '..', '..', 'plugin-template', 'bot-template', 'index.js');
  res.json(botRunner.startBot(id, token, templatePath));
});

app.post('/api/bots/:id/stop', (req, res) => {
  res.json(botRunner.stopBot(parseInt(req.params.id)));
});

app.post('/api/bots/:id/restart', async (req, res) => {
  const id = parseInt(req.params.id);
  const db = await import('./database.js');
  const bot = await db.getBot(id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });
  const token = decrypt(bot.token_encrypted);
  const templatePath = path.join(__dirname, '..', '..', 'plugin-template', 'bot-template', 'index.js');
  res.json(botRunner.restartBot(id, token, templatePath));
});

app.get('/api/bots/:id/logs', (req, res) => {
  res.json({ logs: botRunner.getLogs(parseInt(req.params.id)) });
});

// ============================================
// SMART TOKEN REPLACE
// ============================================

app.post('/api/bots/:id/scan-tokens', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = await import('./database.js');
    const bot = await db.getBot(id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const botDir = path.join(__dirname, '..', '..', 'plugin-template', 'bot-template');
    const scan = await tokenReplacer.scanDirectory(botDir);
    res.json(scan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bots/:id/replace-token', async (req, res) => {
  try {
    const { filePath, oldToken, newToken } = req.body;
    const result = await tokenReplacer.replaceToken(filePath, oldToken, newToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// STATUS & ACTIVITY ENGINE
// ============================================

app.post('/api/bots/:id/analyze-status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = await import('./database.js');
    const bot = await db.getBot(id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const botDir = path.join(__dirname, '..', '..', 'plugin-template', 'bot-template');
    const analysis = await statusEngine.analyzeBot(botDir);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bots/:id/apply-status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = await import('./database.js');
    const bot = await db.getBot(id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const botDir = path.join(__dirname, '..', '..', 'plugin-template', 'bot-template');
    const result = await statusEngine.applyStatus(botDir, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bots/:id/remove-status', async (req, res) => {
  try {
    const botDir = path.join(__dirname, '..', '..', 'plugin-template', 'bot-template');
    const result = await statusEngine.removeStatus(botDir);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// IMPORT/EXPORT API
// ============================================

app.post('/api/export', async (req, res) => {
  try {
    const result = await importExport.exportAll(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import', async (req, res) => {
  try {
    const { source, strategy, name } = req.body;
    const result = await importExport.importData(source, { strategy, name });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fleets', (req, res) => {
  res.json(importExport.listFleets());
});

app.post('/api/fleets/:id/activate', async (req, res) => {
  try {
    const result = await importExport.activateFleet(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fleets/:id', (req, res) => {
  const deleted = importExport.deleteFleet(req.params.id);
  res.json({ success: deleted });
});

// ============================================
// FEATURES
// ============================================

app.get('/api/bots/:id/features', async (req, res) => {
  const db = await import('./database.js');
  res.json(await db.getFeatures(parseInt(req.params.id)));
});

app.post('/api/bots/:id/features/:name', async (req, res) => {
  const { enabled, config } = req.body;
  const db = await import('./database.js');
  await db.setFeature(parseInt(req.params.id), req.params.name, enabled, config);
  res.json({ success: true });
});

app.get('/api/features', (req, res) => {
  res.json(loadFeatures());
});

// ============================================
// GUILD SCANNER
// ============================================

app.post('/api/scan-guild', async (req, res) => {
  try {
    const { guildId } = req.body;
    if (!guildId) return res.status(400).json({ error: 'Guild ID required' });

    const db = await import('./database.js');
    const bots = await db.getBots();
    const found = [];

    for (const bot of bots) {
      const token = decrypt(bot.token_encrypted);
      if (!token) continue;

      try {
        const { Client, GatewayIntentBits } = await import('discord.js');
        const client = new Client({ intents: [GatewayIntentBits.Guilds] });
        await client.login(token);
        const guilds = await client.guilds.fetch();
        const target = guilds.get(guildId);

        if (target) {
          const fullGuild = await client.guilds.fetch(guildId);
          const member = await fullGuild.members.fetch(client.user.id);

          await db.cacheGuild(guildId, bot.id, {
            name: fullGuild.name,
            icon: fullGuild.iconURL({ size: 128 }),
            member_count: fullGuild.memberCount,
            bot_nickname: member?.nickname || client.user.username,
            bot_permissions: member?.permissions?.toArray()?.join(',') || ''
          });

          found.push({
            bot_id: bot.id,
            bot_name: bot.name,
            bot_avatar: bot.avatar_url,
            guild_name: fullGuild.name,
            guild_icon: fullGuild.iconURL({ size: 128 }),
            member_count: fullGuild.memberCount,
            bot_nickname: member?.nickname || client.user.username,
            permissions: member?.permissions?.toArray() || [],
            is_admin: member?.permissions?.has('Administrator') || false
          });
        }

        await client.destroy();
      } catch (err) {
        console.error(`[Scan] Bot ${bot.id} error:`, err.message);
      }
    }

    res.json({ guild_id: guildId, found_count: found.length, bots: found, cached: await db.getGuildCache(guildId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// MESSAGE MONITOR
// ============================================

app.post('/api/monitor/start', async (req, res) => {
  try {
    const { guildId, botId } = req.body;
    if (!guildId || !botId) return res.status(400).json({ error: 'Guild ID and Bot ID required' });
    if (monitor.isMonitoring(guildId)) return res.status(400).json({ error: 'Already monitoring this guild' });

    const db = await import('./database.js');
    const bot = await db.getBot(botId);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    const token = decrypt(bot.token_encrypted);
    if (!token) return res.status(500).json({ error: 'Token decryption failed' });

    const result = await monitor.startMonitoring(guildId, botId, token);
    res.json({ success: true, session_id: result.sessionId, guild_name: result.guildName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/monitor/stop', async (req, res) => {
  try {
    const { guildId } = req.body;
    if (!guildId) return res.status(400).json({ error: 'Guild ID required' });
    await monitor.stopMonitoring(guildId);
    res.json({ success: true, message: 'Monitoring stopped' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/monitor/:guildId/messages', async (req, res) => {
  const { guildId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const db = await import('./database.js');
  const session = await db.getActiveMonitorSession(guildId);
  if (!session) return res.status(404).json({ error: 'No active monitor for this guild' });

  res.json({
    session_id: session.id,
    guild_name: session.guild_name,
    active: session.active,
    messages: await db.getMessages(session.id, limit, offset),
    total: await db.getMessageCount(session.id),
    limit, offset
  });
});

app.get('/api/monitor/:guildId/stats', async (req, res) => {
  const db = await import('./database.js');
  const session = await db.getActiveMonitorSession(req.params.guildId);
  if (!session) return res.status(404).json({ error: 'No active monitor' });
  res.json({
    guild_id: session.guild_id, guild_name: session.guild_name,
    active: !!session.active, started_at: session.started_at,
    message_count: session.message_count, edit_count: session.edit_count, delete_count: session.delete_count
  });
});

app.get('/api/monitor/:guildId/channels', async (req, res) => {
  try {
    const { guildId } = req.params;
    const db = await import('./database.js');
    const session = await db.getActiveMonitorSession(guildId);
    if (!session) return res.status(404).json({ error: 'No active monitor' });

    const bot = await db.getBot(session.bot_id);
    const token = decrypt(bot.token_encrypted);

    const { Client, GatewayIntentBits } = await import('discord.js');
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    await client.login(token);
    const guild = await client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();

    const channelList = channels
      .filter(c => c.isTextBased() && !c.isDMBased())
      .map(c => ({ id: c.id, name: c.name, type: c.type, position: c.position }))
      .sort((a, b) => a.position - b.position);

    await client.destroy();
    res.json({ channels: channelList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/monitor/:guildId/send', async (req, res) => {
  try {
    const { guildId } = req.params;
    const { channelId, content } = req.body;

    const db = await import('./database.js');
    const session = await db.getActiveMonitorSession(guildId);
    if (!session) return res.status(404).json({ error: 'No active monitor' });

    const bot = await db.getBot(session.bot_id);
    const token = decrypt(bot.token_encrypted);

    const { Client, GatewayIntentBits } = await import('discord.js');
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    await client.login(token);

    const channel = await client.channels.fetch(channelId);
    const msg = await channel.send(content);

    await client.destroy();
    res.json({ success: true, messageId: msg.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// INTELLIGENCE API
// ============================================

app.get('/api/intelligence/graph', async (req, res) => {
  try {
    const intelligence = new FleetIntelligence();
    const graph = intelligence.buildFleetGraph();
    intelligence.close();
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/intelligence/health', async (req, res) => {
  try {
    const intelligence = new FleetIntelligence();
    const health = intelligence.calculateHealthScore();
    intelligence.close();
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/intelligence/token-collisions', async (req, res) => {
  try {
    const intelligence = new FleetIntelligence();
    const collisions = intelligence.findTokenCollisions();
    intelligence.close();
    res.json(collisions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/intelligence/permission-gaps', async (req, res) => {
  try {
    const intelligence = new FleetIntelligence();
    const gaps = intelligence.analyzePermissionGaps();
    intelligence.close();
    res.json(gaps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/intelligence/attack-surface', async (req, res) => {
  try {
    const intelligence = new FleetIntelligence();
    const surface = intelligence.mapAttackSurface();
    intelligence.close();
    res.json(surface);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/intelligence/costs', async (req, res) => {
  try {
    const intelligence = new FleetIntelligence();
    const costs = intelligence.estimateCosts();
    intelligence.close();
    res.json(costs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/intelligence/token-rotate', async (req, res) => {
  try {
    const { botId, newToken } = req.body;
    if (!botId || !newToken) return res.status(400).json({ error: 'botId and newToken required' });

    const db = await import('./database.js');
    const bot = await db.getBot(botId);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const intelligence = new FleetIntelligence(db.getDB(), { encrypt, decrypt });
    const result = await intelligence.rotateToken(botId, newToken);
    intelligence.close();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/intelligence/message-replay', async (req, res) => {
  try {
    const { messageId, guildId } = req.body;
    if (!messageId || !guildId) return res.status(400).json({ error: 'messageId and guildId required' });

    const db = await import('./database.js');
    const intelligence = new FleetIntelligence(db.getDB());
    const replay = await intelligence.replayMessage(messageId, guildId);
    intelligence.close();
    res.json(replay);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/intelligence/debug-bundle', async (req, res) => {
  try {
    const { botId, guildId, timeRange } = req.body;
    if (!botId || !guildId || !timeRange) return res.status(400).json({ error: 'botId, guildId, timeRange required' });

    const db = await import('./database.js');
    const intelligence = new FleetIntelligence(db.getDB());
    const bundle = await intelligence.exportDebugBundle(botId, guildId, timeRange);
    intelligence.close();
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/intelligence/bot-forge', async (req, res) => {
  try {
    const { templateName, variables, options } = req.body;
    if (!templateName) return res.status(400).json({ error: 'templateName required' });

    const forge = new BotForge();
    const project = await forge.generate(templateName, variables || {}, options || {});
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/intelligence/bot-templates', async (req, res) => {
  try {
    const forge = new BotForge();
    const templates = forge.listTemplates();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// DASHBOARD SPA FALLBACK
// ============================================

app.get('*', (req, res) => {
  res.sendFile(path.join(DASHBOARD_PATH, 'index.html'));
});

// ============================================
// START SERVER
// ============================================

server.listen(PORT, () => {
  console.log(`[PHANTOM] Fleet Manager v0.0.1 running on http://0.0.0.0:${PORT}`);
  console.log(`[PHANTOM] Dashboard: http://0.0.0.0:${PORT}`);
  console.log(`[PHANTOM] WebSocket: ws://0.0.0.0:${PORT}/ws`);
  console.log(`[PHANTOM] Made by Phantom`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[PHANTOM] Shutting down...');
  botRunner.stopAll();
  closeDB();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', async () => {
  console.log('\n[PHANTOM] Shutting down...');
  botRunner.stopAll();
  closeDB();
  server.close(() => process.exit(0));
});

export { app, server, broadcast };