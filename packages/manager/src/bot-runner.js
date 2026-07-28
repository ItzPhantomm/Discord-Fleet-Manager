const { spawn } = require('child_process');
const path = require('path');
const db = require('./database');

class BotRunner {
  constructor() { this.processes = new Map(); }

  startBot(botId, token, scriptPath) {
    if (this.processes.has(botId)) return { success: false, error: 'Bot already running' };
    const logs = [];
    const env = { ...process.env, BOT_TOKEN: token, BOT_ID: botId.toString() };
    const child = spawn('node', [scriptPath], { env, cwd: path.dirname(scriptPath), detached: false });

    const addLog = (type, data) => {
      const line = `[${new Date().toISOString()}] [${type}] ${data.toString().trim()}`;
      logs.push(line);
      if (logs.length > 500) logs.shift();
    };

    child.stdout.on('data', (d) => addLog('INFO', d));
    child.stderr.on('data', (d) => addLog('WARN', d));
    child.on('exit', (code) => {
      addLog('EXIT', `Process exited with code ${code}`);
      db.updateBotStatus(botId, 'offline', null, null).catch(e => console.error('[PHANTOM] DB error:', e.message));
      this.processes.delete(botId);
    });
    child.on('error', (err) => addLog('ERROR', err.message));

    this.processes.set(botId, { process: child, logs, pid: child.pid });
    db.updateBotStatus(botId, 'online', child.pid, Date.now()).catch(e => console.error('[PHANTOM] DB error:', e.message));
    return { success: true, pid: child.pid };
  }

  stopBot(botId) {
    const proc = this.processes.get(botId);
    if (!proc) return { success: false, error: 'Bot not running' };
    try { proc.process.kill('SIGTERM'); setTimeout(() => { if (!proc.process.killed) proc.process.kill('SIGKILL'); }, 5000); } catch (e) {}
    this.processes.delete(botId);
    db.updateBotStatus(botId, 'offline', null, null).catch(e => console.error('[PHANTOM] DB error:', e.message));
    return { success: true };
  }

  restartBot(botId, token, scriptPath) {
    this.stopBot(botId);
    setTimeout(() => this.startBot(botId, token, scriptPath), 1000);
    return { success: true };
  }

  getLogs(botId) { const proc = this.processes.get(botId); return proc ? proc.logs : []; }
  getStatus(botId) { const proc = this.processes.get(botId); return proc ? { running: true, pid: proc.pid } : { running: false }; }
  getAllStatuses() { const result = {}; for (const [botId, proc] of this.processes) result[botId] = { running: true, pid: proc.pid }; return result; }
}

module.exports = new BotRunner();
