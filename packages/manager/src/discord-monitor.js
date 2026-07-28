const { Client, GatewayIntentBits, Partials } = require('discord.js');
const db = require('./database');

class DiscordMonitor {
  constructor() {
    this.clients = new Map();
    this.wsBroadcast = null;
  }
  setWSBroadcast(fn) { this.wsBroadcast = fn; }

  async startMonitoring(guildId, botId, decryptedToken) {
    if (this.clients.has(guildId)) throw new Error('Already monitoring this guild');
    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
      partials: [Partials.Message, Partials.Channel]
    });
    let sessionId = null, guildName = null, guildIcon = null;

    client.once('ready', async () => {
      console.log(`[PHANTOM Monitor] Connected as ${client.user.tag} for guild ${guildId}`);
      try {
        const guild = await client.guilds.fetch(guildId);
        guildName = guild.name; guildIcon = guild.iconURL({ size: 64 });
        sessionId = await db.createMonitorSession(guildId, guildName, guildIcon, botId);
        this.clients.set(guildId, { client, sessionId, botId, guildName, startedAt: Date.now() });
        if (this.wsBroadcast) this.wsBroadcast('monitor:status', { guildId, status: 'connected', guildName, guildIcon, sessionId, botId });
        await this.fetchHistory(client, guildId, sessionId);
      } catch (err) { client.destroy(); this.clients.delete(guildId); throw err; }
    });

    client.on('messageCreate', async (msg) => {
      if (msg.guildId !== guildId || !sessionId) return;
      const data = this.formatMessage(msg, sessionId, 'default');
      const msgId = await db.insertMessage(data); await db.updateMonitorStats(sessionId, 'message');
      if (this.wsBroadcast) this.wsBroadcast('monitor:msg:create', { ...data, id: msgId });
    });

    client.on('messageUpdate', async (oldMsg, newMsg) => {
      if (newMsg.guildId !== guildId || !sessionId || oldMsg.content === newMsg.content) return;
      const oldContent = oldMsg.content || '[Unknown - not cached]';
      await db.updateMessageEdit(newMsg.id, newMsg.content, oldContent); await db.updateMonitorStats(sessionId, 'edit');
      if (this.wsBroadcast) this.wsBroadcast('monitor:msg:update', { discord_msg_id: newMsg.id, new_content: newMsg.content, old_content: oldContent, author_name: newMsg.author?.tag || 'Unknown', channel_id: newMsg.channelId, timestamp: Date.now() });
    });

    client.on('messageDelete', async (msg) => {
      if (msg.guildId !== guildId || !sessionId) return;
      await db.markMessageDeleted(msg.id); await db.updateMonitorStats(sessionId, 'delete');
      if (this.wsBroadcast) this.wsBroadcast('monitor:msg:delete', { discord_msg_id: msg.id, deleted_at: Date.now(), author_name: msg.author?.tag || 'Unknown', channel_id: msg.channelId });
    });

    client.on('messageDeleteBulk', async (messages) => {
      for (const msg of messages.values()) {
        if (msg.guildId !== guildId || !sessionId) continue;
        await db.markMessageDeleted(msg.id); await db.updateMonitorStats(sessionId, 'delete');
      }
      if (this.wsBroadcast) this.wsBroadcast('monitor:msg:bulk_delete', { count: messages.size, guildId, deleted_at: Date.now() });
    });

    client.on('error', (err) => console.error('[PHANTOM Monitor] Error:', err.message));
    await client.login(decryptedToken);
    return { sessionId, guildName };
  }

  async fetchHistory(client, guildId, sessionId) {
    try {
      const guild = await client.guilds.fetch(guildId);
      const channels = await guild.channels.fetch();
      let fetched = 0;
      for (const [, channel] of channels) {
        if (channel.isTextBased() && !channel.isDMBased() && fetched < 100) {
          try {
            const messages = await channel.messages.fetch({ limit: 50 });
            for (const [, msg] of messages) { await db.insertMessage(this.formatMessage(msg, sessionId, 'default')); fetched++; }
          } catch (e) {}
        }
      }
      console.log(`[PHANTOM Monitor] Fetched ${fetched} historical messages`);
      if (this.wsBroadcast) this.wsBroadcast('monitor:history', { guildId, count: fetched, sessionId });
    } catch (err) { console.error('[PHANTOM Monitor] History error:', err.message); }
  }

  formatMessage(msg, sessionId, type) {
    return {
      discord_msg_id: msg.id, guild_id: msg.guildId, channel_id: msg.channelId, channel_name: msg.channel?.name || 'unknown',
      author_id: msg.author?.id || 'unknown', author_name: msg.author?.tag || msg.author?.username || 'Unknown',
      author_avatar: msg.author?.displayAvatarURL({ size: 64 }) || '', author_discriminator: msg.author?.discriminator || '0',
      content: msg.content || '',
      attachments: msg.attachments.map(a => ({ url: a.url, name: a.name, contentType: a.contentType, size: a.size })),
      embeds: msg.embeds.map(e => ({ title: e.title, description: e.description, url: e.url, color: e.color, fields: e.fields, image: e.image?.url, thumbnail: e.thumbnail?.url, footer: e.footer?.text })),
      monitor_session_id: sessionId, message_type: type
    };
  }

  async stopMonitoring(guildId) {
    const monitor = this.clients.get(guildId);
    if (!monitor) return false;
    const { client, sessionId } = monitor;
    try { client.destroy(); } catch (e) {}
    this.clients.delete(guildId);
    if (sessionId) await db.stopMonitorSession(sessionId);
    if (this.wsBroadcast) this.wsBroadcast('monitor:status', { guildId, status: 'disconnected' });
    return true;
  }

  getActiveMonitors() {
    const result = [];
    for (const [guildId, data] of this.clients) {
      result.push({ guildId, guildName: data.guildName, sessionId: data.sessionId, botId: data.botId, uptime: Date.now() - (data.startedAt || Date.now()) });
    }
    return result;
  }
  isMonitoring(guildId) { return this.clients.has(guildId); }
}

module.exports = new DiscordMonitor();
