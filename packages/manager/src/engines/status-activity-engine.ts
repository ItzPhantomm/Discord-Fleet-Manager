import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StatusAnalysis {
  hasSetPresence: boolean;
  hasSetActivity: boolean;
  hasClientUser: boolean;
  injectionPoints: InjectionPoint[];
  currentStatus?: string;
  currentActivity?: {
    name: string;
    type: number;
    url?: string;
  };
}

export interface InjectionPoint {
  file: string;
  line: number;
  type: 'setPresence' | 'setActivity' | 'setStatus' | 'clientReady' | 'clientUser';
  context: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface StatusConfig {
  status?: 'online' | 'idle' | 'dnd' | 'invisible';
  activity?: {
    name: string;
    type: 0 | 1 | 2 | 3 | 4 | 5; // Playing, Streaming, Listening, Watching, Custom, Competing
    url?: string;
  } | null;
}

export class StatusActivityEngine {
  async analyzeBot(botDir: string): Promise<StatusAnalysis> {
    const files = await this.findBotFiles(botDir);
    const analysis: StatusAnalysis = {
      hasSetPresence: false,
      hasSetActivity: false,
      hasClientUser: false,
      injectionPoints: []
    };

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      this.analyzeFile(file, content, analysis);
    }

    return analysis;
  }

  private async findBotFiles(dir: string): Promise<string[]> {
    const { glob } = await import('glob');
    return glob('**/*.{js,ts}', { 
      cwd: dir, 
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });
  }

  private analyzeFile(filePath: string, content: string, analysis: StatusAnalysis): void {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for client.user.setPresence
      if (line.includes('client.user.setPresence') || line.includes('bot.user.setPresence')) {
        analysis.hasSetPresence = true;
        analysis.injectionPoints.push({
          file: filePath,
          line: i + 1,
          type: 'setPresence',
          context: line.trim(),
          confidence: 'high'
        });
      }

      // Check for client.user.setActivity
      if (line.includes('client.user.setActivity') || line.includes('bot.user.setActivity')) {
        analysis.hasSetActivity = true;
        analysis.injectionPoints.push({
          file: filePath,
          line: i + 1,
          type: 'setActivity',
          context: line.trim(),
          confidence: 'high'
        });
      }

      // Check for client.user.setStatus
      if (line.includes('client.user.setStatus') || line.includes('bot.user.setStatus')) {
        analysis.injectionPoints.push({
          file: filePath,
          line: i + 1,
          type: 'setStatus',
          context: line.trim(),
          confidence: 'high'
        });
      }

      // Check for client.on('ready') or client.once('ready')
      if (line.includes("client.on('ready')") || line.includes('client.once(\'ready\')') || 
          line.includes('client.on("ready")') || line.includes('client.once("ready")')) {
        analysis.injectionPoints.push({
          file: filePath,
          line: i + 1,
          type: 'clientReady',
          context: line.trim(),
          confidence: 'high'
        });
      }

      // Check for client.user access
      if (line.includes('client.user') || line.includes('bot.user')) {
        analysis.hasClientUser = true;
        analysis.injectionPoints.push({
          file: filePath,
          line: i + 1,
          type: 'clientUser',
          context: line.trim(),
          confidence: 'medium'
        });
      }
    }
  }

  async applyStatus(botDir: string, config: StatusConfig): Promise<{ success: boolean; filesModified: number; error?: string }> {
    try {
      const files = await this.findBotFiles(botDir);
      let filesModified = 0;

      // Find the best file to inject (prefer main entry point)
      const mainFile = this.findMainFile(files);
      if (!mainFile) {
        return { success: false, filesModified: 0, error: 'No suitable bot entry file found' };
      }

      const content = await fs.readFile(mainFile, 'utf-8');
      const newContent = this.injectStatusCode(content, config);
      
      if (newContent !== content) {
        await fs.writeFile(mainFile, newContent, 'utf-8');
        filesModified = 1;
      }

      return { success: true, filesModified };
    } catch (err) {
      return { success: false, filesModified: 0, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  private findMainFile(files: string[]): string | null {
    // Priority order for main entry files
    const priorities = [
      'index.js', 'index.ts',
      'main.js', 'main.ts',
      'bot.js', 'bot.ts',
      'src/index.js', 'src/index.ts',
      'src/main.js', 'src/main.ts',
      'src/bot.js', 'src/bot.ts'
    ];

    for (const priority of priorities) {
      const found = files.find(f => f.endsWith(priority));
      if (found) return found;
    }

    // Fallback: first JS/TS file
    return files[0] || null;
  }

  private injectStatusCode(content: string, config: StatusConfig): string {
    const statusCode = this.generateStatusCode(config);
    
    // Check if status code already exists
    if (content.includes('// PHANTOM_STATUS_INJECTION')) {
      // Replace existing injection
      return content.replace(
        /\/\/ PHANTOM_STATUS_INJECTION_START[\s\S]*?\/\/ PHANTOM_STATUS_INJECTION_END/,
        statusCode
      );
    }

    // Try to inject after client login or ready event
    const lines = content.split('\n');
    let injected = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Inject after client.login()
      if (line.includes('.login(') && !injected) {
        lines.splice(i + 1, 0, '', statusCode, '');
        injected = true;
        break;
      }
      
      // Inject after ready event
      if ((line.includes("client.on('ready')") || line.includes('client.once(\'ready\')') || 
           line.includes('client.on("ready")') || line.includes('client.once("ready")')) && !injected) {
        // Find the opening brace of the callback
        for (let j = i; j < lines.length; j++) {
          if (lines[j].includes('{')) {
            lines.splice(j + 1, 0, statusCode);
            injected = true;
            break;
          }
        }
        if (injected) break;
      }
    }

    if (!injected) {
      // Append at the end
      lines.push('', statusCode);
    }

    return lines.join('\n');
  }

  private generateStatusCode(config: StatusConfig): string {
    const status = config.status || 'online';
    const activity = config.activity;

    let activityCode = 'null';
    if (activity) {
      const types = ['Playing', 'Streaming', 'Listening', 'Watching', 'Custom', 'Competing'];
      const typeName = types[activity.type] || 'Playing';
      activityCode = `{
        name: ${JSON.stringify(activity.name)},
        type: ${activity.type},
        ${activity.url ? `url: ${JSON.stringify(activity.url)},` : ''}
      }`;
    }

    return `// PHANTOM_STATUS_INJECTION_START
// Auto-generated by Phantom Fleet Manager - DO NOT EDIT MANUALLY
// To modify, use the dashboard or CLI: phantom-fleet status:set

(async () => {
  try {
    await client.user.setPresence({
      status: '${status}',
      activities: ${activityCode ? `[${activityCode}]` : '[]'},
      afk: false
    });
    console.log('[PHANTOM] Status applied:', '${status}', ${activity ? `'${activity.name}' (${types[activity.type] || 'Playing'})` : 'no activity'});
  } catch (err) {
    console.error('[PHANTOM] Failed to set status:', err);
  }
})();
// PHANTOM_STATUS_INJECTION_END`;
  }

  async removeStatus(botDir: string): Promise<{ success: boolean; filesModified: number; error?: string }> {
    try {
      const files = await this.findBotFiles(botDir);
      let filesModified = 0;

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        
        if (content.includes('// PHANTOM_STATUS_INJECTION_START')) {
          const newContent = content.replace(
            /\/\/ PHANTOM_STATUS_INJECTION_START[\s\S]*?\/\/ PHANTOM_STATUS_INJECTION_END\n?/g,
            ''
          );
          
          if (newContent !== content) {
            await fs.writeFile(file, newContent, 'utf-8');
            filesModified++;
          }
        }
      }

      return { success: true, filesModified };
    } catch (err) {
      return { success: false, filesModified: 0, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}