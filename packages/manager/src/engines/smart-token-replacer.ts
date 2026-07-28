import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TokenMatch {
  file: string;
  line: number;
  column: number;
  context: string;
  type: 'literal' | 'template' | 'concat' | 'env' | 'variable';
  tokenPreview: string;
}

export class SmartTokenReplacer {
  private tokenRegex = /[\w-]{24}\.[\w-]{6}\.[\w-]{27}/; // Discord token pattern
  private tokenRegexGlobal = /[\w-]{24}\.[\w-]{6}\.[\w-]{27}/g;

  async scanDirectory(dirPath: string): Promise<{ tokens: TokenMatch[]; filesScanned: number }> {
    const tokens: TokenMatch[] = [];
    let filesScanned = 0;

    const files = await this.getAllFiles(dirPath);
    
    for (const file of files) {
      if (this.shouldScanFile(file)) {
        filesScanned++;
        const fileTokens = await this.scanFile(file);
        tokens.push(...fileTokens);
      }
    }

    return { tokens, filesScanned };
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!this.shouldSkipDir(entry.name)) {
          files.push(...await this.getAllFiles(fullPath));
        }
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private shouldSkipDir(name: string): boolean {
    return ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'logs', 'data'].includes(name);
  }

  private shouldScanFile(file: string): boolean {
    const ext = path.extname(file).toLowerCase();
    return ['.js', '.ts', '.json', '.env', '.yaml', '.yml'].includes(ext);
  }

  private async scanFile(filePath: string): Promise<TokenMatch[]> {
    const matches: TokenMatch[] = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;
        
        while ((match = this.tokenRegexGlobal.exec(line)) !== null) {
          const token = match[0];
          const start = match.index;
          
          // Determine token type by context
          const type = this.determineTokenType(line, start);
          
          matches.push({
            file: filePath,
            line: i + 1,
            column: start + 1,
            context: line.trim().slice(0, 100),
            type,
            tokenPreview: token.slice(0, 15) + '...' + token.slice(-5)
          });
        }
      }
    } catch (err) {
      // Skip unreadable files
    }

    return matches;
  }

  private determineTokenType(line: string, index: number): 'literal' | 'template' | 'concat' | 'env' | 'variable' {
    const before = line.slice(Math.max(0, index - 20), index);
    const after = line.slice(index, index + 20);

    if (before.includes('${') || after.startsWith('}')) return 'template';
    if (before.includes('+') || after.startsWith('+')) return 'concat';
    if (before.includes('process.env') || before.includes('env.')) return 'env';
    if (/[a-zA-Z_$][\w$]*\s*[:=]/.test(before.slice(-30))) return 'variable';
    return 'literal';
  }

  async replaceToken(filePath: string, oldToken: string, newToken: string): Promise<{ success: boolean; error?: string; replacements: number }> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (!content.includes(oldToken)) {
        return { success: false, error: 'Token not found in file', replacements: 0 };
      }

      const newContent = content.split(oldToken).join(newToken);
      const replacements = (content.match(new RegExp(this.escapeRegex(oldToken), 'g')) || []).length;
      
      await fs.writeFile(filePath, newContent, 'utf-8');
      
      return { success: true, replacements };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error', replacements: 0 };
    }
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}