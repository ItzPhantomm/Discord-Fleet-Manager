import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

function getSecretKey(): Buffer {
  const secret = process.env.FLEET_SECRET;
  if (!secret) {
    throw new Error('FLEET_SECRET environment variable is required. Generate one with: openssl rand -base64 32');
  }
  return Buffer.from(secret, 'base64');
}

function deriveKey(password: Buffer, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH, { N: ITERATIONS });
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const secretKey = getSecretKey();
  const key = deriveKey(secretKey, salt);
  
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  // Format: salt:iv:tag:ciphertext (all base64)
  return [
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64')
  ].join(':');
}

export function decrypt(ciphertext: string): string | null {
  if (!ciphertext) return null;
  
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 4) return null;
    
    const [saltB64, ivB64, tagB64, ciphertextB64] = parts;
    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(ciphertextB64, 'base64');
    
    const secretKey = getSecretKey();
    const key = deriveKey(secretKey, salt);
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

export function rotateKey(oldSecret: string, newSecret: string): void {
  // For key rotation: decrypt with old, re-encrypt with new
  // This would be used in a migration script
}

export function validateSecret(secret: string): boolean {
  try {
    const key = Buffer.from(secret, 'base64');
    return key.length === KEY_LENGTH;
  } catch {
    return false;
  }
}

export function generateSecret(): string {
  return randomBytes(KEY_LENGTH).toString('base64');
}