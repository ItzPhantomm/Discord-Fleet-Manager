// [PHANTOM FLEET MANAGER] - Made by Phantom
// Smart Status & Activity Engine
// Detects existing status code, injects or modifies intelligently

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const { ActivityType, PresenceUpdateStatus } = require('discord.js');

class StatusActivityEngine {
  constructor() {
    this.patterns = {
      // Existing status patterns
      setActivity: /client\.user\.setActivity\s*\(/g,
      setPresence: /client\.user\.setPresence\s*\(/g,
      setStatus: /client\.user\.setStatus\s*\(/g,
      // Ready event patterns
      readyEvent: /client\.once\s*\(\s*['"`]ready['"`]/g,
      onReady: /client\.on\s*\(\s*['"`]ready['"`]/g,
      // Activity type patterns
      activityTypes: /ActivityType\.(Playing|Streaming|Listening|Watching|Competing|Custom)/g,
    };
  }

  /**
   * Analyze a bot's code to understand its status setup
   */
  async analyzeBot(botDir) {
    const analysis = {
      hasStatusCode: false,
      hasActivityCode: false,
      hasReadyEvent: false,
      statusLocation: null,
      activityLocation: null,
      readyLocation: null,
      files: [],
      recommendations: []
    };

    const jsFiles = glob.sync('**/*.js', { cwd: botDir, absolute: true });

    for (const file of jsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = path.relative(botDir, file);
      const fileAnalysis = {
        path: relativePath,
        hasSetActivity: this.patterns.setActivity.test(content),
        hasSetPresence: this.patterns.setPresence.test(content),
        hasSetStatus: this.patterns.setStatus.test(content),
        hasReadyEvent: this.patterns.readyEvent.test(content) || this.patterns.onReady.test(content),
        hasActivityTypes: this.patterns.activityTypes.test(content),
        lineCount: content.split('\n').length
      };

      // Reset regex lastIndex
      Object.keys(this.patterns).forEach(k => this.patterns[k].lastIndex = 0);

      if (fileAnalysis.hasSetActivity || fileAnalysis.hasSetPresence) {
        analysis.hasActivityCode = true;
        analysis.activityLocation = relativePath;
      }
      if (fileAnalysis.hasSetStatus || fileAnalysis.hasSetPresence) {
        analysis.hasStatusCode = true;
        analysis.statusLocation = relativePath;
      }
      if (fileAnalysis.hasReadyEvent) {
        analysis.hasReadyEvent = true;
        analysis.readyLocation = relativePath;
      }

      analysis.files.push(fileAnalysis);
    }

    // Generate recommendations
    if (!analysis.hasReadyEvent) {
      analysis.recommendations.push('No ready event found - will create status-handler.js');
    }
    if (analysis.hasActivityCode) {
      analysis.recommendations.push(`Existing activity code found in ${analysis.activityLocation} - will patch intelligently`);
    } else {
      analysis.recommendations.push('No activity code found - will inject new code');
    }

    return analysis;
  }

  /**
   * Apply status/activity to a bot
   */
  async applyStatus(botDir, config) {
    const analysis = await this.analyzeBot(botDir);
    const { status, activity, activityType, url } = config;

    // Strategy 1: Bot has ready event with existing status - patch it
    if (analysis.hasReadyEvent && analysis.hasActivityCode) {
      return await this.patchExistingStatus(botDir, analysis, config);
    }

    // Strategy 2: Bot has ready event but no status - inject into ready
    if (analysis.hasReadyEvent && !analysis.hasActivityCode) {
      return await this.injectIntoReady(botDir, analysis, config);
    }

    // Strategy 3: No ready event at all - create external handler
    return await this.createExternalHandler(botDir, config);
  }

  /**
   * Patch existing status code intelligently
   */
  async patchExistingStatus(botDir, analysis, config) {
    const filePath = path.join(botDir, analysis.activityLocation || analysis.statusLocation);
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Find and replace setActivity calls
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('setActivity') || lines[i].includes('setPresence')) {
        // Comment out old line, add new one below
        const indent = lines[i].match(/^(\s*)/)?.[1] || '';
        lines[i] = indent + '// [PHANTOM] Original status overridden by Fleet Manager';
        lines.splice(i + 1, 0, indent + this.generateStatusCode(config));
        break;
      }
    }

    fs.writeFileSync(filePath, lines.join('\n'));
    return { method: 'patched', file: analysis.activityLocation };
  }

  /**
   * Inject status code into existing ready event
   */
  async injectIntoReady(botDir, analysis, config) {
    const filePath = path.join(botDir, analysis.readyLocation);
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Find ready event callback end and inject before closing
    let readyCallbackEnd = -1;
    let braceCount = 0;
    let inReadyCallback = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/client\.(once|on)\s*\(\s*['"`]ready['"`]/)) {
        inReadyCallback = true;
      }
      if (inReadyCallback) {
        braceCount += (lines[i].match(/{/g) || []).length;
        braceCount -= (lines[i].match(/}/g) || []).length;
        if (braceCount === 0 && inReadyCallback) {
          readyCallbackEnd = i;
          break;
        }
      }
    }

    if (readyCallbackEnd > 0) {
      const indent = '    ';
      lines.splice(readyCallbackEnd, 0, 
        '',
        indent + '// [PHANTOM] Fleet Manager Status Injection',
        indent + this.generateStatusCode(config)
      );
      fs.writeFileSync(filePath, lines.join('\n'));
      return { method: 'injected', file: analysis.readyLocation };
    }

    // Fallback to external handler
    return await this.createExternalHandler(botDir, config);
  }

  /**
   * Create external status handler file
   */
  async createExternalHandler(botDir, config) {
    const handlerPath = path.join(botDir, 'phantom-status-handler.js');
    const code = this.generateExternalHandlerCode(config);
    fs.writeFileSync(handlerPath, code);

    // Inject require at top of main file
    const mainFiles = ['index.js', 'bot.js', 'main.js', 'app.js'];
    let mainFile = null;
    for (const f of mainFiles) {
      if (fs.existsSync(path.join(botDir, f))) {
        mainFile = path.join(botDir, f);
        break;
      }
    }

    if (mainFile) {
      let content = fs.readFileSync(mainFile, 'utf8');
      const requireLine = `require('./phantom-status-handler.js'); // [PHANTOM] Status handler`;
      if (!content.includes('phantom-status-handler')) {
        content = requireLine + '\n' + content;
        fs.writeFileSync(mainFile, content);
      }
    }

    return { method: 'external', file: 'phantom-status-handler.js', injectedInto: mainFile };
  }

  /**
   * Generate status code snippet
   */
  generateStatusCode(config) {
    const { status, activity, activityType, url } = config;
    const typeMap = {
      'playing': 'ActivityType.Playing',
      'streaming': 'ActivityType.Streaming',
      'listening': 'ActivityType.Listening',
      'watching': 'ActivityType.Watching',
      'competing': 'ActivityType.Competing',
      'custom': 'ActivityType.Custom'
    };

    const type = typeMap[activityType?.toLowerCase()] || 'ActivityType.Playing';

    let code = `client.user.setPresence({
`;
    code += `      status: '${status || 'online'}',
`;
    code += `      activities: [{
`;
    code += `        name: '${activity || 'Phantom Fleet Manager'}',
`;
    code += `        type: ${type}`;
    if (url && activityType?.toLowerCase() === 'streaming') {
      code += `,
        url: '${url}'`;
    }
    code += `
      }]
`;
    code += `    });`;

    return code;
  }

  /**
   * Generate full external handler file
   */
  generateExternalHandlerCode(config) {
    return `// [PHANTOM FLEET MANAGER] - External Status Handler
// Auto-generated by Phantom Fleet Manager v2.0
// Do not modify manually - use Fleet Manager dashboard instead

const { ActivityType } = require('discord.js');

module.exports = function setupStatus(client) {
  client.once('ready', () => {
    console.log('[PHANTOM] Applying status configuration...');
    ${this.generateStatusCode(config)}
    console.log('[PHANTOM] Status applied successfully');
  });
};

// Auto-apply if client is already passed
if (typeof module !== 'undefined' && module.parent) {
  const parent = module.parent;
  if (parent.exports && parent.exports.login) {
    setupStatus(parent.exports);
  }
}
`;
  }

  /**
   * Remove status handler
   */
  async removeStatus(botDir) {
    const handlerPath = path.join(botDir, 'phantom-status-handler.js');
    if (fs.existsSync(handlerPath)) {
      fs.unlinkSync(handlerPath);
    }

    // Remove require from main files
    const mainFiles = ['index.js', 'bot.js', 'main.js', 'app.js'];
    for (const f of mainFiles) {
      const filePath = path.join(botDir, f);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/require\(['"`]\.\/phantom-status-handler\.js['"`]\);?\s*\/\/ \[PHANTOM\].*\n?/g, '');
        content = content.replace(/\/\/ \[PHANTOM\] Original status overridden by Fleet Manager\n?/g, '');
        fs.writeFileSync(filePath, content);
      }
    }

    return { removed: true };
  }
}

module.exports = StatusActivityEngine;
