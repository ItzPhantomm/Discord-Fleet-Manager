import { EventEmitter } from 'events';
import { Client, GatewayIntentBits, TextChannel, Guild, GuildMember } from 'discord.js';

interface MonitorSession {
  id: number;
  guildId: string;
  guildName: string;
  botId: number;
  active: boolean;
  client: Client;
  wsClientId?: string;
}

export class DiscordMonitor extends EventEmitter {
  private sessions = new Map<string, MonitorSession>();
  private wsBroadcast: ((type: string, data: any) => void) | null = null;

  setWSBroadcast(fn: (type: string, data: any) => void) {
    this.wsBroadcast = fn;
  }

  isMonitoring(guildId: string): boolean {
    return this.sessions.has(guildId);
  }

  async startMonitoring(guildId: string, botId: number, token: string): Promise<{ sessionId: number; guildName: string }> {
    if (this.sessions.has(guildId)) {
      throw new Error('Already monitoring this guild');
    }

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions
      ]
    });

    await client.login(token);

    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(client.user!.id);

    const session: MonitorSession = {
      id: Date.now(),
      guildId,
      guildName: guild.name,
      botId,
      active: true,
      client
    };

    this.sessions.set(guildId, session);

    // Message create
    client.on('messageCreate', async (message) => {
      if (message.author.bot) return;
      if (!message.inGuild()) return;
      
      const eventData = {
        sessionId: session.id,
        guildName: guild.name,
        message: {
          id: message.id,
          content: message.content,
          author: {
            id: message.author.id,
            username: message.author.username,
            discriminator: message.author.discriminator,
            avatar: message.author.displayAvatarURL({ size: 64 }),
            bot: message.author.bot
          },
          channel: {
            id: message.channelId,
            name: message.channel instanceof TextChannel ? message.channel.name : 'DM'
          },
          timestamp: message.createdTimestamp,
          attachments: message.attachments.map(a => ({
            id: a.id,
            name: a.name,
            url: a.url,
            contentType: a.contentType,
            size: a.size
          })),
          embeds: message.embeds.map(e => e.toJSON()),
          type: message.type
        }
      };

      this.emit('message', eventData);
      this.wsBroadcast?.('monitor_message', eventData);
    });

    // Message update
    client.on('messageUpdate', async (oldMessage, newMessage) => {
      if (newMessage.author.bot) return;
      if (!newMessage.inGuild()) return;

      const eventData = {
        sessionId: session.id,
        guildName: guild.name,
        message: {
          id: newMessage.id,
          content: newMessage.content,
          oldContent: oldMessage.content,
          author: {
            id: newMessage.author.id,
            username: newMessage.author.username,
            discriminator: newMessage.author.discriminator,
            avatar: newMessage.author.displayAvatarURL({ size: 64 }),
            bot: newMessage.author.bot
          },
          channel: {
            id: newMessage.channelId,
            name: newMessage.channel instanceof TextChannel ? newMessage.channel.name : 'DM'
          },
          timestamp: newMessage.editedTimestamp || newMessage.createdTimestamp,
          attachments: newMessage.attachments.map(a => ({
            id: a.id,
            name: a.name,
            url: a.url,
            contentType: a.contentType,
            size: a.size
          })),
          embeds: newMessage.embeds.map(e => e.toJSON()),
          type: newMessage.type
        }
      };

      this.emit('messageEdit', eventData);
      this.wsBroadcast?.('monitor_message', { ...eventData, type: 'edit' });
    });

    // Message delete
    client.on('messageDelete', async (message) => {
      if (message.author?.bot) return;
      if (!message.inGuild?.()) return;

      const eventData = {
        sessionId: session.id,
        guildName: guild.name,
        message: {
          id: message.id,
          content: message.content || '',
          author: {
            id: message.author?.id || 'unknown',
            username: message.author?.username || 'Unknown',
            discriminator: message.author?.discriminator || '0000',
            avatar: message.author?.displayAvatarURL?.({ size: 64 }) || null,
            bot: message.author?.bot || false
          },
          channel: {
            id: message.channelId,
            name: message.channel instanceof TextChannel ? message.channel.name : 'DM'
          },
          timestamp: Date.now(),
          deleted: true
        }
      };

      this.emit('messageDelete', eventData);
      this.wsBroadcast?.('monitor_message', { ...eventData, type: 'delete' });
    });

    return { sessionId: session.id, guildName: guild.name };
  }

  async stopMonitoring(guildId: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) return;

    session.client.destroy();
    this.sessions.delete(guildId);
  }

  getSession(guildId: string): MonitorSession | undefined {
    return this.sessions.get(guildId);
  }

  async getChannels(guildId: string): Promise<{ id: string; name: string; type: number; position: number }[]> {
    const session = this.sessions.get(guildId);
    if (!session) throw new Error('No active monitor for this guild');

    const guild = await session.client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();

    return channels
      .filter(c => c?.isTextBased() && !c.isDMBased())
      .map(c => ({
        id: c!.id,
        name: c!.name,
        type: c!.type,
        position: c!.position
      }))
      .sort((a, b) => a.position - b.position);
  }

  async sendMessage(guildId: string, channelId: string, content: string): Promise<string> {
    const session = this.sessions.get(guildId);
    if (!session) throw new Error('No active monitor for this guild');

    const channel = await session.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) throw new Error('Invalid channel');

    const message = await (channel as TextChannel).send(content);
    return message.id;
  }
}