const CryptoJS = require('crypto-js');
const SECRET_KEY = process.env.FLEET_SECRET || 'phantom-fleet-manager-secret-key-change-in-production-32chars!!';
function encrypt(text) { if (!text) return null; return CryptoJS.AES.encrypt(text, SECRET_KEY).toString(); }
function decrypt(encrypted) { if (!encrypted) return null; try { const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY); return bytes.toString(CryptoJS.enc.Utf8) || null; } catch (e) { return null; } }
module.exports = { encrypt, decrypt };
