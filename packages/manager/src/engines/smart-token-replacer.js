// [PHANTOM FLEET MANAGER] - Made by Phantom
// Smart Token Replace Engine
// Analyzes bot files, detects token patterns, replaces without breaking code

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const TOKEN_PATTERNS = [
  // Discord bot tokens
  /process\.env\.(BOT_TOKEN|TOKEN|DISCORD_TOKEN|CLIENT_TOKEN)/gi,
  /client\.login\(['"`]([A-Za-z0-9_-]{50,100})['"`]/g,
  /login\(['"`]([A-Za-z0-9_-]{50,100})['"`]/g,
  /token\s*[:=]\s*['"`]([A-Za-z0-9_-]{50,100})['"`]/gi,
  /['"`](M[A-Za-z0-9_-]{20,80}\.[A-Za-z0-9_-]{5,10}\.[A-Za-z0-9_-]{20,80})['"`]/g,
  /['"`]([A-Za-z0-9_-]{60,90})['"`]/g,
  // Config file patterns
  /token:\s*['"`]([^'"`]+)['"`]/gi,
  /"token"\s*:\s*"([^"]+)"/gi,
  /'token'\s*:\s*'([^']+)'/gi,
];

const ENV_PATTERNS = [
  /BOT_TOKEN=.*/g,
  /TOKEN=.*/g,
  /DISCORD_TOKEN=.*/g,
  /CLIENT_TOKEN=.*/g,
];

class SmartTokenReplacer {
  constructor() {
    this.replacements = [];
    this.backupDir = path.join(__dirname, '..', 'backups', 'tokens');
  }

  /**
   * Scan a directory for token usage
   */
  async scanDirectory(dirPath, options = {}) {
    const results = {
      files: [],
      tokens: [],
      envFiles: [],
      configFiles: [],
      summary: {}
    };

    const patterns = options.patterns || ['**/*.js', '**/*.json', '**/.env*', '**/*.env', '**/*.config.*'];

    for (const pattern of patterns) {
      const files = glob.sync(pattern, { cwd: dirPath, absolute: true, nodir: true });
      for (const file of files) {
        const fileResult = await this.scanFile(file);
        if (fileResult.found) {
          results.files.push(fileResult);
          results.tokens.push(...fileResult.tokens);
        }
      }
    }

    results.summary = {
      totalFiles: results.files.length,
      totalTokens: results.tokens.length,
      uniqueTokens: [...new Set(results.tokens.map(t => t.value))].length,
      envFiles: results.files.filter(f => f.isEnv).length,
      configFiles: results.files.filter(f => f.isConfig).length
    };

    return results;
  }

  /**
   * Scan a single file for tokens
   */
  async scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = {
      path: filePath,
      filename: path.basename(filePath),
      found: false,
      isEnv: path.basename(filePath).startsWith('.env'),
      isConfig: filePath.includes('config'),
      tokens: [],
      lines: []
    };

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for hardcoded tokens
      for (const pattern of TOKEN_PATTERNS) {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          const tokenValue = match[1] || match[0];
          if (this.isValidToken(tokenValue)) {
            result.found = true;
            result.tokens.push({
              value: tokenValue,
              line: i + 1,
              column: match.index,
              match: match[0],
              pattern: pattern.toString(),
              context: line.trim()
            });
            result.lines.push({
              number: i + 1,
              content: line,
              hasToken: true
            });
          }
        }
      }

      // Check env patterns
      if (result.isEnv) {
        for (const pattern of ENV_PATTERNS) {
          if (pattern.test(line)) {
            result.found = true;
            const tokenValue = line.split('=')[1]?.trim();
            if (tokenValue && this.isValidToken(tokenValue)) {
              result.tokens.push({
                value: tokenValue,
                line: i + 1,
                match: line.trim(),
                isEnv: true
              });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Validate if a string looks like a Discord token
   */
  isValidToken(str) {
    if (!str || str.length < 50) return false;
    // Discord token format: base64.user_id.timestamp_hmac
    const parts = str.split('.');
    if (parts.length === 3) {
      // Mxxxxxxxxxx.user_id.timestamp_hmac format
      return /^[A-Za-z0-9_-]+$/.test(parts[0]) && parts[0].length > 20;
    }
    // Or just a long alphanumeric string
    return /^[A-Za-z0-9_-]{50,120}$/.test(str);
  }

  /**
   * Replace token in a file while preserving structure
   */
  async replaceToken(filePath, oldToken, newToken, options = {}) {
    const createBackup = options.backup !== false;

    if (createBackup) {
      await this.createBackup(filePath);
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Smart replacement strategies
    const strategies = [
      // Exact match
      () => content.replace(new RegExp(this.escapeRegex(oldToken), 'g'), newToken),
      // In quotes
      () => content.replace(new RegExp(`['"\`]${this.escapeRegex(oldToken)}['"\`]`, 'g'), (m) => m.replace(oldToken, newToken)),
      // In env format
      () => content.replace(new RegExp(`(TOKEN\s*=\s*)${this.escapeRegex(oldToken)}`, 'gi'), `$1${newToken}`),
      // In JSON
      () => content.replace(new RegExp(`("token"\s*:\s*")${this.escapeRegex(oldToken)}("`, 'gi'), `$1${newToken}$2`),
    ];

    let replaced = false;
    for (const strategy of strategies) {
      const newContent = strategy();
      if (newContent !== content) {
        content = newContent;
        replaced = true;
      }
    }

    if (!replaced && content.includes(oldToken)) {
      // Fallback: direct replace
      content = content.split(oldToken).join(newToken);
      replaced = true;
    }

    if (replaced) {
      // Verify file is still valid
      if (this.verifyFileIntegrity(originalContent, content)) {
        fs.writeFileSync(filePath, content);
        this.replacements.push({
          file: filePath,
          oldToken: oldToken.substring(0, 10) + '...',
          newToken: newToken.substring(0, 10) + '...',
          timestamp: Date.now()
        });
        return { success: true, file: filePath };
      } else {
        // Restore backup
        if (createBackup) {
          this.restoreBackup(filePath);
        }
        return { success: false, error: 'File integrity check failed', file: filePath };
      }
    }

    return { success: false, error: 'Token not found in file', file: filePath };
  }

  /**
   * Replace all tokens across a bot directory
   */
  async replaceAllTokens(botDir, newToken, options = {}) {
    const scan = await this.scanDirectory(botDir);
    const results = [];

    for (const file of scan.files) {
      for (const token of file.tokens) {
        const result = await this.replaceToken(file.path, token.value, newToken, options);
        results.push(result);
      }
    }

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results
    };
  }

  /**
   * Create backup before modification
   */
  async createBackup(filePath) {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    const backupName = `${path.basename(filePath)}.${Date.now()}.bak`;
    const backupPath = path.join(this.backupDir, backupName);
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }

  /**
   * Restore from backup
   */
  restoreBackup(filePath) {
    const backups = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith(path.basename(filePath)))
      .sort()
      .reverse();

    if (backups.length > 0) {
      const latestBackup = path.join(this.backupDir, backups[0]);
      fs.copyFileSync(latestBackup, filePath);
      return true;
    }
    return false;
  }

  /**
   * Verify file wasn't corrupted
   */
  verifyFileIntegrity(original, modified) {
    // Check basic structure preservation
    const origBraces = (original.match(/[{}]/g) || []).length;
    const modBraces = (modified.match(/[{}]/g) || []).length;
    if (origBraces !== modBraces) return false;

    const origParens = (original.match(/[()]/g) || []).length;
    const modParens = (modified.match(/[()]/g) || []).length;
    if (origParens !== modParens) return false;

    // Check no syntax breaking
    if (modified.includes('undefined') && !original.includes('undefined')) {
      // Might be okay if it was a token replacement
    }

    return true;
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get replacement history
   */
  getHistory() {
    return this.replacements;
  }
}

module.exports = SmartTokenReplacer;
