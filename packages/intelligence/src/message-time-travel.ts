import { EventEmitter } from 'events';
import type { DebugBundle, BotDecisionTrace, MessageReplay, MessageTimelineEvent } from '../types/engines.js';

export class MessageTimeTravel extends EventEmitter {
  private db: any;
  private decisionLog: Map<string, BotDecisionTrace[]> = new Map();
  private maxLogPerMessage = 1000;

  constructor(db: any) {
    super();
    this.db = db;
    
    // Create decision_log table if not exists
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS decision_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        bot_id INTEGER NOT NULL,
        feature_name TEXT NOT NULL,
        matched INTEGER NOT NULL,
        conditions_json TEXT NOT NULL,
        execution_time_ms INTEGER NOT NULL,
        action_taken TEXT NOT NULL,
        error TEXT,
        middleware_timings_json TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_decision_log_message ON decision_log(message_id);
      CREATE INDEX IF NOT EXISTS idx_decision_log_bot ON decision_log(bot_id);
      CREATE INDEX IF NOT EXISTS idx_decision_log_guild ON decision_log(guild_id);
      CREATE INDEX IF NOT EXISTS idx_decision_log_time ON decision_log(timestamp);
    `);
  }

  /**
   * Record a bot's decision process for a message
   */
  recordDecision(trace: BotDecisionTrace & { messageId: string; guildId: string; botId: number }): void {
    const key = `${trace.botId}:${trace.messageId}`;
    
    if (!this.decisionLog.has(key)) {
      this.decisionLog.set(key, []);
    }
    
    const logs = this.decisionLog.get(key)!;
    logs.push(trace);
    
    // Trim to max
    if (logs.length > this.maxLogPerMessage) {
      logs.shift();
    }

    // Persist to DB (async, fire and forget)
    this.persistDecision(trace).catch(err => console.error('[MessageTimeTravel] Persist error:', err));
  }

  private async persistDecision(trace: BotDecisionTrace & { messageId: string; guildId: string; botId: number }): Promise<void> {
    await this.db.prepare(`
      INSERT INTO decision_log 
      (message_id, guild_id, bot_id, feature_name, matched, conditions_json, execution_time_ms, action_taken, error, middleware_timings_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trace.messageId,
      trace.guildId,
      trace.botId,
      trace.feature,
      trace.matched ? 1 : 0,
      JSON.stringify(trace.conditions),
      trace.executionTimeMs,
      trace.actionTaken,
      trace.error || null,
      JSON.stringify(trace.middlewareTimings || [])
    );
  }

  /**
   * Replay a message's full timeline with bot decision traces
   */
  async replay(messageId: string, guildId: string): Promise<MessageReplay | null> {
    // Get message history from messages table
    const message = await this.db.prepare(`
      SELECT * FROM messages WHERE discord_msg_id = ?
    `).get(messageId);

    if (!message) return null;

    // Get all edits/deletes for this message
    const timeline = await this.buildTimeline(messageId, guildId);
    
    // Get bot decision traces
    const botTraces = await this.getBotDecisionTraces(messageId, guildId);

    return {
      messageId,
      guildId,
      channelId: message.channel_id,
      timeline,
      botDecisionTraces: botTraces,
      exportable: true
    };
  }

  private async buildTimeline(messageId: string, guildId: string): Promise<MessageTimelineEvent[]> {
    const events: MessageTimelineEvent[] = [];
    
    // Original message
    const original = await this.db.prepare(`
      SELECT * FROM messages WHERE discord_msg_id = ? AND monitor_session_id IN (
        SELECT id FROM monitor_sessions WHERE guild_id = ?
      )
    `).get(messageId, guildId);

    if (original) {
      events.push({
        timestamp: original.timestamp,
        type: 'created',
        content: original.content,
        authorId: original.author_id,
        authorName: original.author_name,
        metadata: {
          attachments: JSON.parse(original.attachments_json),
          embeds: JSON.parse(original.embeds_json),
          messageType: original.message_type
        }
      });

      // Edits
      if (original.content_edited) {
        events.push({
          timestamp: original.timestamp + 1, // Approximate
          type: 'edited',
          content: original.content,
          oldContent: original.content_edited,
          authorId: original.author_id,
          authorName: original.author_name
        });
      }

      // Deletion
      if (original.is_deleted) {
        events.push({
          timestamp: original.deleted_at || original.timestamp,
          type: 'deleted',
          authorId: original.author_id,
          authorName: original.author_name,
          metadata: { deletedAt: original.deleted_at }
        });
      }
    }

    return events.sort((a, b) => a.timestamp - b.timestamp);
  }

  private async getBotDecisionTraces(messageId: string, guildId: string): Promise<BotDecisionTrace[]> {
    const rows = await this.db.prepare(`
      SELECT * FROM decision_log WHERE message_id = ? AND guild_id = ?
      ORDER BY timestamp ASC
    `).all(messageId, guildId);

    return rows.map((row: any) => ({
      feature: row.feature_name,
      matched: Boolean(row.matched),
      conditions: JSON.parse(row.conditions_json),
      executionTimeMs: row.execution_time_ms,
      actionTaken: row.action_taken,
      error: row.error,
      middlewareTimings: JSON.parse(row.middleware_timings_json)
    }));
  }

  /**
   * Export debug bundle for sharing
   */
  async exportDebugBundle(botId: number, guildId: string, timeRange: { start: number; end: number }): Promise<DebugBundle> {
    const bot = await this.db.prepare('SELECT * FROM bots WHERE id = ?').get(botId);
    const guild = await this.db.prepare('SELECT * FROM guild_cache WHERE guild_id = ? AND bot_id = ?').get(guildId, botId);
    
    const messages = await this.db.prepare(`
      SELECT m.* FROM messages m
      JOIN monitor_sessions s ON m.monitor_session_id = s.id
      WHERE s.guild_id = ? AND s.bot_id = ? AND m.timestamp BETWEEN ? AND ?
      ORDER BY m.timestamp DESC
      LIMIT 1000
    `).all(guildId, botId, timeRange.start, timeRange.end);

    const replays = await Promise.all(
      messages.map(m => this.replay(m.discord_msg_id, guildId))
    );

    return {
      sessionId: crypto.randomUUID(),
      botId,
      guildId,
      timeRange,
      messages: replays.filter((r): r is MessageReplay => r !== null),
      botConfig: {
        features: await this.db.prepare('SELECT * FROM features WHERE bot_id = ?').all(botId)
      },
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      generatedAt: Date.now()
    };
  }

  /**
   * Get recent decision traces for debugging
   */
  async getRecentTraces(botId: number, limit = 50): Promise<BotDecisionTrace[]> {
    const rows = await this.db.prepare(`
      SELECT * FROM decision_log WHERE bot_id = ?
      ORDER BY timestamp DESC LIMIT ?
    `).all(botId, limit);

    return rows.map((row: any) => ({
      feature: row.feature_name,
      matched: Boolean(row.matched),
      conditions: JSON.parse(row.conditions_json),
      executionTimeMs: row.execution_time_ms,
      actionTaken: row.action_taken,
      error: row.error,
      middlewareTimings: JSON.parse(row.middleware_timings_json)
    }));
  }

  /**
   * Get performance stats
   */
  async getPerformanceStats(botId: number): Promise<{
    avgExecutionTime: number;
    p95ExecutionTime: number;
    totalDecisions: number;
    errorRate: number;
    topSlowFeatures: { feature: string; avgTime: number }[];
  }> {
    const rows = await this.db.prepare(`
      SELECT feature_name, execution_time_ms, error
      FROM decision_log WHERE bot_id = ?
      ORDER BY timestamp DESC LIMIT 10000
    `).all(botId);

    if (rows.length === 0) {
      return { avgExecutionTime: 0, p95ExecutionTime: 0, totalDecisions: 0, errorRate: 0, topSlowFeatures: [] };
    }

    const times = rows.map((r: any) => r.execution_time_ms).sort((a: number, b: number) => a - b);
    const errors = rows.filter((r: any) => r.error).length;
    
    const featureTimes = new Map<string, number[]>();
    for (const row of rows) {
      if (!featureTimes.has(row.feature_name)) featureTimes.set(row.feature_name, []);
      featureTimes.get(row.feature_name)!.push(row.execution_time_ms);
    }

    const topSlowFeatures = Array.from(featureTimes.entries())
      .map(([feature, times]) => ({
        feature,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    return {
      avgExecutionTime: times.reduce((a, b) => a + b, 0) / times.length,
      p95ExecutionTime: times[Math.floor(times.length * 0.95)] || 0,
      totalDecisions: rows.length,
      errorRate: errors / rows.length,
      topSlowFeatures
    };
  }
}

export default MessageTimeTravel;