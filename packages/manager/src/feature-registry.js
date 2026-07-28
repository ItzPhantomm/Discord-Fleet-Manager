const fs = require('fs');
const path = require('path');
const FEATURES_DIR = path.join(__dirname, 'features');
function loadFeatures() {
  const features = [];
  if (!fs.existsSync(FEATURES_DIR)) return features;
  const files = fs.readdirSync(FEATURES_DIR).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const FeatureClass = require(path.join(FEATURES_DIR, file));
      features.push({ name: FeatureClass.name, displayName: FeatureClass.displayName, description: FeatureClass.description, configSchema: FeatureClass.getConfigSchema ? FeatureClass.getConfigSchema() : null });
    } catch (e) { console.error(`[PHANTOM] Failed to load ${file}:`, e.message); }
  }
  return features;
}
module.exports = { loadFeatures };
