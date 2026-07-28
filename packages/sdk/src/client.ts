import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type {
  FleetClientConfig,
  Bot,
  Guild,
  MonitorSession,
  Message,
  FleetHealth,
  TokenCollision,
  PermissionGap,
  FleetGraph,
  MessageReplay,
  DebugBundle,
  FleetEvent,
  FleetEventType,
  PluginManifest,
  PluginContext,
  Plugin
} from './types.js';

/**
 * Main Fleet Client - connects to the manager API and WebSocket
 */
export class FleetClient extends EventEmitter {
  private config: FleetClientConfig;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private apiKey: string | undefined;
  private requestId = 0;
  private pendingRequests: Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }> = new Map();

  constructor(config: FleetClientConfig) {
    super();
    this.config = {
      reconnect: true,
      reconnectInterval: 5000,
      ...config
    };
    this.apiKey = config.apiKey;
  }

  /**
   * Connect to the fleet manager
   */
  async connect(): Promise<void> {
    await this.connectWS();
  }

  /**
   * Disconnect from the fleet manager
   */
  disconnect(): void {
    this.config.reconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private async connectWS(): Promise<void> {
    const wsUrl = this.config.wsUrl || this.config.baseUrl.replace('http', 'ws') + '/ws';
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
      });

      this.ws.on('open', () => {
        console.log('[FleetClient] WebSocket connected');
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('[FleetClient] Failed to parse message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('[FleetClient] WebSocket disconnected');
        this.emit('disconnected');
        if (this.config.reconnect) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (error) => {
        console.error('[FleetClient] WebSocket error:', error);
        this.emit('error', error);
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          reject(error);
        }
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[FleetClient] Reconnecting...');
      this.connectWS().catch(err => console.error('[FleetClient] Reconnect failed:', err));
    }, this.config.reconnectInterval);
  }

  private handleMessage(message: any): void {
    // Handle request responses
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message || 'Unknown error'));
      } else {
        resolve(message.result);
      }
      return;
    }

    // Handle events
    if (message.type) {
      this.emit(message.type, message.data);
      this.emit('event', message as FleetEvent);
    }
  }

  private async request(method: string, params?: any): Promise<any> {
    const id = ++this.requestId;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.ws!.send(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      }));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  // ============ REST API Methods ============

  private async fetchApi(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`API Error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // --- Bots ---
  async getBots(): Promise<Bot[]> {
    return this.fetchApi('/api/bots');
  }

  async getBot(id: number): Promise<Bot> {
    return this.fetchApi(`/api/bots/${id}`);
  }

  async createBot(name: string, token: string): Promise<Bot> {
    return this.fetchApi('/api/bots', {
      method: 'POST',
      body: JSON.stringify({ name, token })
    });
  }

  async deleteBot(id: number): Promise<void> {
    await this.fetchApi(`/api/bots/${id}`, { method: 'DELETE' });
  }

  async startBot(id: number, templatePath?: string): Promise<{ success: boolean; pid?: number; error?: string }> {
    return this.fetchApi(`/api/bots/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ templatePath })
    });
  }

  async stopBot(id: number): Promise<{ success: boolean }> {
    return this.fetchApi(`/api/bots/${id}/stop`, { method: 'POST' });
  }

  async restartBot(id: number, templatePath?: string): Promise<{ success: boolean }> {
    return this.fetchApi(`/api/bots/${id}/restart`, {
      method: 'POST',
      body: JSON.stringify({ templatePath })
    });
  }

  async getBotLogs(id: number): Promise<string[]> {
    const result = await this.fetchApi(`/api/bots/${id}/logs`);
    return result.logs;
  }

  async getBotFeatures(id: number): Promise<BotFeature[]> {
    return this.fetchApi(`/api/bots/${id}/features`);
  }

  async setBotFeature(id: number, featureName: string, enabled: boolean, config?: Record<string, unknown>): Promise<void> {
    await this.fetchApi(`/api/bots/${id}/features/${featureName}`, {
      method: 'POST',
      body: JSON.stringify({ enabled, config })
    });
  }

  // --- Features ---
  async getFeatures(): Promise<string[]> {
    return this.fetchApi('/api/features');
  }

  // --- Monitoring ---
  async startMonitor(guildId: string, botId: number): Promise<{ sessionId: number; guildName: string }> {
    return this.fetchApi('/api/monitor/start', {
      method: 'POST',
      body: JSON.stringify({ guildId, botId })
    });
  }

  async stopMonitor(guildId: string): Promise<void> {
    await this.fetchApi('/api/monitor/stop', {
      method: 'POST',
      body: JSON.stringify({ guildId })
    });
  }

  async getMonitorMessages(guildId: string, limit = 50, offset = 0): Promise<{ messages: Message[]; total: number }> {
    return this.fetchApi(`/api/monitor/${guildId}/messages?limit=${limit}&offset=${offset}`);
  }

  async getMonitorStats(guildId: string): Promise<any> {
    return this.fetchApi(`/api/monitor/${guildId}/stats`);
  }

  async getMonitorChannels(guildId: string): Promise<{ channels: any[] }> {
    return this.fetchApi(`/api/monitor/${guildId}/channels`);
  }

  async sendMessage(guildId: string, channelId: string, content: string): Promise<{ messageId: string }> {
    return this.fetchApi(`/api/monitor/${guildId}/send`, {
      method: 'POST',
      body: JSON.stringify({ channelId, content })
    });
  }

  // --- Intelligence ---
  async getFleetGraph(): Promise<FleetGraph> {
    return this.fetchApi('/api/intelligence/graph');
  }

  async getFleetHealth(): Promise<FleetHealth> {
    return this.fetchApi('/api/intelligence/health');
  }

  async getTokenCollisions(): Promise<TokenCollision[]> {
    return this.fetchApi('/api/intelligence/token-collisions');
  }

  async getPermissionGaps(): Promise<PermissionGap[]> {
    return this.fetchApi('/api/intelligence/permission-gaps');
  }

  async getAttackSurface(): Promise<any> {
    return this.fetchApi('/api/intelligence/attack-surface');
  }

  async getCostBreakdown(): Promise<any> {
    return this.fetchApi('/api/intelligence/costs');
  }

  async scanGuild(guildId: string): Promise<any> {
    return this.fetchApi('/api/scan-guild', {
      method: 'POST',
      body: JSON.stringify({ guildId })
    });
  }

  // --- Token Management ---
  async scanTokens(botId: number): Promise<any> {
    return this.fetchApi(`/api/bots/${botId}/scan-tokens`, { method: 'POST' });
  }

  async replaceToken(botId: number, filePath: string, oldToken: string, newToken: string): Promise<any> {
    return this.fetchApi(`/api/bots/${botId}/replace-token`, {
      method: 'POST',
      body: JSON.stringify({ filePath, oldToken, newToken })
    });
  }

  // --- Status/Activity Engine ---
  async analyzeStatus(botId: number): Promise<any> {
    return this.fetchApi(`/api/bots/${botId}/analyze-status`, { method: 'POST' });
  }

  async applyStatus(botId: number, config: any): Promise<any> {
    return this.fetchApi(`/api/bots/${botId}/apply-status`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async removeStatus(botId: number): Promise<any> {
    return this.fetchApi(`/api/bots/${botId}/remove-status`, { method: 'POST' });
  }

  // --- Import/Export ---
  async exportFleet(options: any): Promise<any> {
    return this.fetchApi('/api/export', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async importFleet(source: string, strategy: string, name?: string): Promise<any> {
    return this.fetchApi('/api/import', {
      method: 'POST',
      body: JSON.stringify({ source, strategy, name })
    });
  }

  async listFleets(): Promise<any[]> {
    return this.fetchApi('/api/fleets');
  }

  async activateFleet(fleetId: string): Promise<any> {
    return this.fetchApi(`/api/fleets/${fleetId}/activate`, { method: 'POST' });
  }

  async deleteFleet(fleetId: string): Promise<void> {
    await this.fetchApi(`/api/fleets/${fleetId}`, { method: 'DELETE' });
  }

  // --- Guild Cache ---
  async getGuildCache(guildId: string): Promise<any[]> {
    return this.fetchApi(`/api/guilds/${guildId}/cache`);
  }

  // --- Message Time Travel ---
  async replayMessage(messageId: string, guildId: string): Promise<MessageReplay> {
    return this.fetchApi(`/api/intelligence/replay`, {
      method: 'POST',
      body: JSON.stringify({ messageId, guildId })
    });
  }

  async exportDebugBundle(botId: number, guildId: string, timeRange: { start: number; end: number }): Promise<DebugBundle> {
    return this.fetchApi('/api/intelligence/debug-bundle', {
      method: 'POST',
      body: JSON.stringify({ botId, guildId, timeRange })
    });
  }

  // --- Bot Forge ---
  async generateBot(templateName: string, variables: Record<string, string>, options: any): Promise<any> {
    return this.fetchApi('/api/bot-forge/generate', {
      method: 'POST',
      body: JSON.stringify({ templateName, variables, options })
    });
  }

  async listBotTemplates(): Promise<any[]> {
    return this.fetchApi('/api/bot-forge/templates');
  }

  // ============ WebSocket Event Subscriptions ============

  /**
   * Subscribe to fleet events via WebSocket
   */
  onBotStatusChange(callback: (data: { botId: number; status: string; pid?: number; uptime?: number }) => void): () => void {
    this.on('bot_status', callback);
    return () => this.off('bot_status', callback);
  }

  onBotLog(callback: (data: { botId: number; logs: string[] }) => void): () => void {
    this.on('bot_log', callback);
    return () => this.off('bot_log', callback);
  }

  onMonitorMessage(callback: (data: { sessionId: number; message: Message }) => void): () => void {
    this.on('monitor_message', callback);
    return () => this.off('monitor_message', callback);
  }

  onMonitorStats(callback: (data: { sessionId: number; messageCount: number; editCount: number; deleteCount: number }) => void): () => void {
    this.on('monitor_stats', callback);
    return () => this.off('monitor_stats', callback);
  }

  onFleetHealthUpdate(callback: (health: FleetHealth) => void): () => void {
    this.on('fleet_health', callback);
    return () => this.off('fleet_health', callback);
  }

  onIntelligenceUpdate(callback: (data: any) => void): () => void {
    this.on('intelligence_update', callback);
    return () => this.off('intelligence_update', callback);
  }

  onError(callback: (error: Error) => void): () => void {
    this.on('error', callback);
    return () => this.off('error', callback);
  }
}

/**
 * Create a fleet client with auto-detected configuration
 */
export function createFleetClient(options: {
  baseUrl?: string;
  apiKey?: string;
  autoDetect?: boolean;
} = {}): FleetClient {
  let baseUrl = options.baseUrl;
  
  if (options.autoDetect || !baseUrl) {
    // Try common local URLs
    const candidates = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FLEET_MANAGER_URL
    ].filter(Boolean);
    
    baseUrl = candidates[0] || 'http://localhost:3000';
  }

  return new FleetClient({
    baseUrl: baseUrl!,
    apiKey: options.apiKey,
    wsUrl: baseUrl?.replace('http', 'ws') + '/ws'
  });
}

export default FleetClient;