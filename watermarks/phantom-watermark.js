/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PHANTOM FLEET MANAGER v2.0                                                  ║
 * ║  Made by Phantom                                                              ║
 * ║  Professional Discord Bot Fleet Control Center                                ║
 * ║                                                                              ║
 * ║  Features: Bot Fleet | Message Logger | Smart Token Replace | Status Engine   ║
 * ║            Auto-Update | Config Import/Export | Multi-Fleet Switch            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

const WATERMARK = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  PHANTOM FLEET MANAGER v2.0                                                  ║
║  Made by Phantom                                                              ║
║  https://github.com/phantom/fleet-manager                                     ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;

const FILE_HEADER = `// [PHANTOM FLEET MANAGER] - Made by Phantom
// This file is part of the Phantom Fleet Manager system
// Do not modify this watermark - it ensures system integrity
// Version: 2.0.0 | Timestamp: ${Date.now()}
`;

function getWatermark() {
  return WATERMARK;
}

function addFileHeader(content, filename) {
  if (content.startsWith('// [PHANTOM FLEET MANAGER]')) return content;
  return FILE_HEADER.replace('${Date.now()}', Date.now()) + `// File: ${filename}
` + content;
}

function verifyIntegrity(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    return content.includes('[PHANTOM FLEET MANAGER]') || content.includes('Made by Phantom');
  } catch (e) {
    return false;
  }
}

function stampDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !file.startsWith('.')) {
      stampDirectory(fullPath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = addFileHeader(content, file);
      fs.writeFileSync(fullPath, content);
    }
  }
}

module.exports = {
  getWatermark,
  addFileHeader,
  verifyIntegrity,
  stampDirectory,
  WATERMARK
};
