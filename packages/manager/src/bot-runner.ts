import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { updateBotStatus } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BotProcess {
  process: ChildProcess;
  logs: string[];
  pid: number;
}

export class BotRunner {
  private processes = new Map<number, BotProcess>();

  startBot(botId: number, token: string, scriptPath: string) {
    if (this.processes.has(botId)) return { success: false, error: 'Bot already running' };
    
    const logs: string[] = [];
    const env = { ...process.env, BOT_TOKEN: token, BOT_ID: botId.toString() };
    const child = spawn('node', [scriptPath], { 
      env, 
      cwd: path.dirname(scriptPath),
      detached: false 
    });

    const addLog = (type: string, data: Buffer) => {
      const line = `[${new Date().toISOString()}] [${type}] ${data.toString().trim()}`;
      logs.push(line);
      if (logs.length > 500) logs.shift();
    };

    child.stdout.on('data', (d) => addLog('INFO', d));
    child.stderr.on('data', (d) => addLog('WARN', d));
    child.on('exit', (code) => {
      addLog('EXIT', `Process exited with code ${code}`);
      updateBotStatus(botId, 'offline', null, null).catch(e => console.error('[PHANTOM] DB error:', e.message));
      this.processes.delete(botId);
    });
    child.on('error', (err) => addLog('ERROR', err.message));

    this.processes.set(botId, { process: child, logs, pid: child.pid! });
    updateBotStatus(botId, 'online', child.pid!, Date.now()).catch(e => console.error('[PHANTOM] DB error:', e.message));
    return { success: true, pid: child.pid };
  }

  stopBot(botId: number) {
    const proc = this.processes.get(botId);
    if (!proc) return { success: false, error: 'Bot not running' };
    try { 
      proc.process.kill('SIGTERM'); 
      setTimeout(() => { if (!proc.process.killed) proc.process.kill('SIGKILL'); }, 5000); 
    } catch (e) {}
    this.processes.delete(botId);
    updateBotStatus(botId, 'offline', null, null).catch(e => console.error('[PHANTOM] DB error:', e.message));
    return { success: true };
  }

  restartBot(botId: number, token: string, scriptPath: string) {
    this.stopBot(botId);
    setTimeout(() => this.startBot(botId, token, scriptPath), 1000);
    return { success: true };
  }

  getLogs(botId: number) { 
    const proc = this.processes.get(botId); 
    return proc ? proc.logs : []; 
  }
  
  getStatus(botId: number) { 
    const proc = this.processes.get(botId); 
    return proc ? { running: true, pid: proc.pid } : { running: false }; 
  }
  
  getAllStatuses() { 
    const result: Record<number, { running: boolean; pid?: number }> = {}; 
    for (const [botId, proc] of this.processes) result[botId] = { running: true, pid: proc.pid }; 
    return result; 
  }

  stopAll() {
    for (const [botId] of this.processes) this.stopBot(botId);
  }
}