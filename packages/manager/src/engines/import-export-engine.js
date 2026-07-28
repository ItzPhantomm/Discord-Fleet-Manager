// [PHANTOM FLEET MANAGER] - Made by Phantom
// Smart Import/Export Engine
// Handles updates, config imports, fleet imports without breaking code

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'fleet.db');
const CONFIG_PATH = path.join(__dirname, '..', 'config');
const FLEETS_DIR = path.join(__dirname, '..', 'fleets');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

class ImportExportEngine {
  constructor() {
    this.version = '2.0.0';
    this.watermark = 'PHANTOM_FLEET_MANAGER';
  }

  // ═══════════════════════════════════════════════════════════
  // EXPORT SYSTEM
  // ═══════════════════════════════════════════════════════════

  /**
   * Export full fleet manager state
   */
  async exportAll(options = {}) {
    const exportData = {
      metadata: {
        version: this.version,
        exportedAt: Date.now(),
        exportedBy: 'Phantom Fleet Manager',
        watermark: this.watermark
      },
      database: await this.exportDatabase(),
      config: this.exportConfig(),
      bots: await this.exportBots(),
      features: await this.exportFeatures(),
      monitors: await this.exportMonitors()
    };

    if (options.format === 'zip') {
      return await this.createZipExport(exportData, options);
    }

    return exportData;
  }

  /**
   * Export database as portable format
   */
  async exportDatabase() {
    const db = require('../database');
    const d = db.getDB();
    return new Promise((resolve, reject) => {
      d.all("SELECT name FROM sqlite_master WHERE type='table'", [], async (err, tables) => {
        if (err) return reject(err);
        const data = {};
        for (const table of tables) {
          data[table.name] = await new Promise((res, rej) => {
            d.all(`SELECT * FROM ${table.name}`, [], (e, rows) => e ? rej(e) : res(rows));
          });
        }
        resolve(data);
      });
    });
  }

  /**
   * Export config files
   */
  exportConfig() {
    const config = {};
    if (fs.existsSync(CONFIG_PATH)) {
      const files = fs.readdirSync(CONFIG_PATH);
      for (const file of files) {
        const filePath = path.join(CONFIG_PATH, file);
        config[file] = fs.readFileSync(filePath, 'utf8');
      }
    }
    return config;
  }

  /**
   * Export bot tokens (encrypted)
   */
  async exportBots() {
    const db = require('../database');
    const bots = await db.getBots();
    return bots.map(b => ({
      id: b.id,
      name: b.name,
      client_id: b.client_id,
      avatar_url: b.avatar_url,
      status: b.status,
      // Token stays encrypted - only transferable within Phantom ecosystem
      token_encrypted: b.token_encrypted
    }));
  }

  async exportFeatures() {
    const db = require('../database');
    const allFeatures = [];
    const bots = await db.getBots();
    for (const bot of bots) {
      const features = await db.getFeatures(bot.id);
      allFeatures.push(...features.map(f => ({ ...f, bot_name: bot.name })));
    }
    return allFeatures;
  }

  async exportMonitors() {
    const db = require('../database');
    const d = db.getDB();
    return new Promise((resolve, reject) => {
      d.all('SELECT * FROM monitor_sessions WHERE active = 1', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async createZipExport(data, options) {
    const zip = new AdmZip();
    const jsonData = JSON.stringify(data, null, 2);
    zip.addFile('fleet-export.json', Buffer.from(jsonData, 'utf8'));

    // Add README
    zip.addFile('README.txt', Buffer.from(this.generateExportReadme(), 'utf8'));

    const outputPath = options.output || path.join(BACKUP_DIR, `fleet-export-${Date.now()}.zip`);
    zip.writeZip(outputPath);
    return { path: outputPath, size: fs.statSync(outputPath).size };
  }

  // ═══════════════════════════════════════════════════════════
  // IMPORT SYSTEM (SMART MERGE)
  // ═══════════════════════════════════════════════════════════

  /**
   * Smart import with merge strategies
   */
  async importData(source, options = {}) {
    const strategy = options.strategy || 'merge'; // 'merge', 'replace', 'switch'
    const importData = await this.loadImportData(source);

    if (!this.validateImport(importData)) {
      throw new Error('Invalid import file - missing Phantom watermark or corrupted');
    }

    const results = {
      strategy,
      imported: {},
      conflicts: [],
      skipped: [],
      fleetId: null
    };

    switch (strategy) {
      case 'merge':
        results.imported = await this.mergeImport(importData, options);
        break;
      case 'replace':
        results.imported = await this.replaceImport(importData, options);
        break;
      case 'switch':
        results.fleetId = await this.switchFleet(importData, options);
        break;
    }

    return results;
  }

  /**
   * Load import data from various sources
   */
  async loadImportData(source) {
    let data;

    if (source.startsWith('http://') || source.startsWith('https://')) {
      // Download from URL (GitHub, Google Drive, etc)
      const response = await axios.get(source, { responseType: 'arraybuffer' });
      const zip = new AdmZip(response.data);
      const entry = zip.getEntry('fleet-export.json');
      if (!entry) throw new Error('Invalid export file - missing fleet-export.json');
      data = JSON.parse(zip.readAsText(entry));
    } else if (source.endsWith('.zip')) {
      const zip = new AdmZip(source);
      const entry = zip.getEntry('fleet-export.json');
      if (!entry) throw new Error('Invalid export file');
      data = JSON.parse(zip.readAsText(entry));
    } else if (source.endsWith('.json')) {
      data = JSON.parse(fs.readFileSync(source, 'utf8'));
    } else if (fs.existsSync(path.join(source, 'fleet-export.json'))) {
      data = JSON.parse(fs.readFileSync(path.join(source, 'fleet-export.json'), 'utf8'));
    } else {
      throw new Error('Unknown import source format');
    }

    return data;
  }

  /**
   * Validate import has Phantom watermark
   */
  validateImport(data) {
    return data && 
           data.metadata && 
           data.metadata.watermark === this.watermark &&
           data.metadata.version;
  }

  /**
   * Merge import with existing data (doesn't override)
   */
  async mergeImport(importData, options) {
    const db = require('../database');
    const results = { bots: 0, features: 0, monitors: 0 };

    // Import bots as new entries (don't override existing)
    const existingBots = await db.getBots();
    for (const bot of importData.bots || []) {
      const existing = existingBots.find(b => b.client_id === bot.client_id);
      if (!existing) {
        await db.addBot(bot.name + ' (Imported)', bot.token_encrypted);
        results.bots++;
      }
    }

    // Import features for matching bots
    const allBots = await db.getBots();
    for (const feature of importData.features || []) {
      const bot = allBots.find(b => b.name === feature.bot_name);
      if (bot) {
        await db.setFeature(bot.id, feature.feature_name, feature.enabled, JSON.parse(feature.config || '{}'));
        results.features++;
      }
    }

    return results;
  }

  /**
   * Replace import (overrides everything)
   */
  async replaceImport(importData, options) {
    // Create backup first
    await this.exportAll({ format: 'zip', output: path.join(BACKUP_DIR, `pre-replace-${Date.now()}.zip`) });

    // Clear and re-import
    const db = require('../database');
    const d = db.getDB();
    await new Promise((resolve, reject) => {
      d.exec('DELETE FROM bots; DELETE FROM features; DELETE FROM monitor_sessions; DELETE FROM messages; DELETE FROM guild_cache;', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return await this.mergeImport(importData, options);
  }

  /**
   * Switch fleet (creates parallel fleet)
   */
  async switchFleet(importData, options) {
    const fleetId = `fleet-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const fleetDir = path.join(FLEETS_DIR, fleetId);

    if (!fs.existsSync(FLEETS_DIR)) fs.mkdirSync(FLEETS_DIR, { recursive: true });
    fs.mkdirSync(fleetDir, { recursive: true });

    // Save fleet data
    fs.writeFileSync(path.join(fleetDir, 'fleet-data.json'), JSON.stringify(importData, null, 2));

    // Create fleet manifest
    const manifest = {
      fleetId,
      name: options.name || `Imported Fleet ${new Date().toLocaleDateString()}`,
      importedAt: Date.now(),
      source: options.source || 'unknown',
      botCount: (importData.bots || []).length,
      active: false
    };
    fs.writeFileSync(path.join(fleetDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    return fleetId;
  }

  /**
   * List available fleets
   */
  listFleets() {
    if (!fs.existsSync(FLEETS_DIR)) return [];
    return fs.readdirSync(FLEETS_DIR)
      .filter(d => fs.statSync(path.join(FLEETS_DIR, d)).isDirectory())
      .map(d => {
        const manifestPath = path.join(FLEETS_DIR, d, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
          return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        }
        return { fleetId: d, name: d, active: false };
      });
  }

  /**
   * Activate a fleet (switch to it)
   */
  async activateFleet(fleetId) {
    const fleetDir = path.join(FLEETS_DIR, fleetId);
    if (!fs.existsSync(fleetDir)) throw new Error('Fleet not found');

    const dataPath = path.join(fleetDir, 'fleet-data.json');
    if (!fs.existsSync(dataPath)) throw new Error('Fleet data corrupted');

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Deactivate all fleets
    this.listFleets().forEach(f => {
      const mPath = path.join(FLEETS_DIR, f.fleetId, 'manifest.json');
      if (fs.existsSync(mPath)) {
        const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
        m.active = false;
        fs.writeFileSync(mPath, JSON.stringify(m, null, 2));
      }
    });

    // Import this fleet as replacement
    await this.replaceImport(data, {});

    // Mark active
    const manifestPath = path.join(fleetDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.active = true;
    manifest.activatedAt = Date.now();
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return { activated: true, fleetId, name: manifest.name };
  }

  /**
   * Delete a fleet
   */
  deleteFleet(fleetId) {
    const fleetDir = path.join(FLEETS_DIR, fleetId);
    if (!fs.existsSync(fleetDir)) return false;
    fs.rmSync(fleetDir, { recursive: true });
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE SYSTEM
  // ═══════════════════════════════════════════════════════════

  /**
   * Check for updates from remote source
   */
  async checkForUpdates(sourceUrl) {
    try {
      const response = await axios.get(`${sourceUrl}/version.json`, { timeout: 10000 });
      const remote = response.data;
      const current = require('../../package.json').version;

      return {
        hasUpdate: this.compareVersions(remote.version, current) > 0,
        currentVersion: current,
        latestVersion: remote.version,
        releaseNotes: remote.notes,
        downloadUrl: remote.downloadUrl
      };
    } catch (e) {
      return { hasUpdate: false, error: e.message };
    }
  }

  /**
   * Apply update from remote
   */
  async applyUpdate(sourceUrl, options = {}) {
    const updateInfo = await this.checkForUpdates(sourceUrl);
    if (!updateInfo.hasUpdate) return { updated: false, reason: 'No update available' };

    // Download update package
    const response = await axios.get(updateInfo.downloadUrl, { 
      responseType: 'arraybuffer',
      timeout: 60000 
    });

    // Create backup
    await this.exportAll({ format: 'zip', output: path.join(BACKUP_DIR, `pre-update-${Date.now()}.zip`) });

    // Extract and apply update
    const zip = new AdmZip(response.data);
    const extractDir = path.join(__dirname, '..', '..', '.update-temp');
    zip.extractAllTo(extractDir, true);

    // Smart merge: only update changed files
    const updatedFiles = await this.smartMergeUpdate(extractDir);

    // Cleanup
    fs.rmSync(extractDir, { recursive: true, force: true });

    return { 
      updated: true, 
      version: updateInfo.latestVersion,
      filesUpdated: updatedFiles 
    };
  }

  /**
   * Smart merge: only update files that changed
   */
  async smartMergeUpdate(updateDir) {
    const updatedFiles = [];
    const baseDir = path.join(__dirname, '..', '..');

    function walkDir(dir, base = '') {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(base, item);
        const targetPath = path.join(baseDir, relativePath);

        if (fs.statSync(fullPath).isDirectory()) {
          if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
          walkDir(fullPath, relativePath);
        } else {
          // Check if file changed
          const newContent = fs.readFileSync(fullPath, 'utf8');
          const oldContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';

          if (newContent !== oldContent) {
            // Preserve user config
            if (relativePath.includes('config') && oldContent) {
              const merged = this.mergeConfigFiles(oldContent, newContent);
              fs.writeFileSync(targetPath, merged);
            } else {
              fs.copyFileSync(fullPath, targetPath);
            }
            updatedFiles.push(relativePath);
          }
        }
      }
    }

    walkDir(updateDir);
    return updatedFiles;
  }

  /**
   * Merge config files preserving user settings
   */
  mergeConfigFiles(oldContent, newContent) {
    try {
      const oldConfig = JSON.parse(oldContent);
      const newConfig = JSON.parse(newContent);
      // Deep merge: new defaults + old user values
      return JSON.stringify({ ...newConfig, ...oldConfig }, null, 2);
    } catch (e) {
      // If not JSON, just return new content
      return newContent;
    }
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }

  generateExportReadme() {
    return `Phantom Fleet Manager Export
=============================
Exported: ${new Date().toISOString()}
Version: ${this.version}

This file contains your fleet configuration.
Import it using: phantom-fleet import <this-file>

WARNING: This file contains encrypted tokens.
Do not share it with untrusted parties.
`;
  }
}

module.exports = ImportExportEngine;
