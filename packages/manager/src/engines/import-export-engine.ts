import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FLEETS_DIR = path.join(__dirname, '..', '..', 'data', 'fleets');

export interface ExportOptions {
  includeBots: boolean;
  includeFeatures: boolean;
  includeGuildCache: boolean;
  includeMonitorSessions: boolean;
}

export interface ImportOptions {
  strategy: 'merge' | 'replace' | 'new-fleet';
  name?: string;
}

export interface FleetData {
  version: string;
  exportedAt: number;
  bots?: any[];
  features?: any[];
  guildCache?: any[];
  monitorSessions?: any[];
}

export class ImportExportEngine {
  constructor() {
    this.ensureFleetsDir();
  }

  private ensureFleetsDir(): void {
    // Will be created on first use
  }

  async exportAll(options: ExportOptions = {
    includeBots: true,
    includeFeatures: true,
    includeGuildCache: true,
    includeMonitorSessions: true
  }): Promise<{ success: boolean; data?: FleetData; filePath?: string; error?: string }> {
    try {
      // Import database dynamically
      const db = await import('../database.js');
      
      const data: FleetData = {
        version: '1.0.0',
        exportedAt: Date.now()
      };

      if (options.includeBots) {
        data.bots = await db.getBots();
        // Don't export encrypted tokens in plain fleet data - they stay encrypted
      }

      if (options.includeFeatures) {
        const bots = await db.getBots();
        data.features = [];
        for (const bot of bots) {
          const features = await db.getFeatures(bot.id);
          data.features.push(...features);
        }
      }

      if (options.includeGuildCache) {
        data.guildCache = [];
        const bots = await db.getBots();
        for (const bot of bots) {
          const cache = await db.getGuildCache(''); // This needs to be fixed - get all guild cache
        }
      }

      if (options.includeMonitorSessions) {
        // Export monitor sessions
      }

      // Create zip file
      const zip = new AdmZip();
      zip.addFile('fleet.json', Buffer.from(JSON.stringify(data, null, 2)));
      
      const fileName = `fleet-${Date.now()}.zip`;
      const filePath = path.join(FLEETS_DIR, fileName);
      
      await fs.mkdir(FLEETS_DIR, { recursive: true });
      zip.writeZip(filePath);

      return { success: true, data, filePath };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  async importData(source: string, options: ImportOptions): Promise<{ success: boolean; fleetId?: string; error?: string }> {
    try {
      const zip = new AdmZip(source);
      const fleetEntry = zip.getEntry('fleet.json');
      if (!fleetEntry) return { success: false, error: 'Invalid fleet archive: missing fleet.json' };

      const data: FleetData = JSON.parse(fleetEntry.getData().toString('utf-8'));
      
      // Import logic would go here
      // For now, just save as a fleet
      const fleetId = `fleet-${Date.now()}`;
      const fleetPath = path.join(FLEETS_DIR, `${fleetId}.zip`);
      
      await fs.mkdir(FLEETS_DIR, { recursive: true });
      zip.writeZip(fleetPath);

      return { success: true, fleetId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  listFleets(): { id: string; name: string; size: number; createdAt: number }[] {
    try {
      const files = fs.readdirSync(FLEETS_DIR);
      return files
        .filter(f => f.endsWith('.zip'))
        .map(f => {
          const stats = fs.statSync(path.join(FLEETS_DIR, f));
          return {
            id: f.replace('.zip', ''),
            name: f,
            size: stats.size,
            createdAt: stats.birthtimeMs
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  }

  async activateFleet(fleetId: string): Promise<{ success: boolean; error?: string }> {
    // Activate a fleet (set as current)
    // This would replace current bot data with fleet data
    return { success: false, error: 'Not implemented yet' };
  }

  deleteFleet(fleetId: string): boolean {
    try {
      const filePath = path.join(FLEETS_DIR, `${fleetId}.zip`);
      fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }
}