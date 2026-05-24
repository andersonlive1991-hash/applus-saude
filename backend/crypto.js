const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.scryptSync(process.env.CRYPTO_SECRET || 'applus-saude-secret-key-2026', 'salt', 32);

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(text)), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return text;
  try {
    const [ivHex, encryptedHex] = text.split(':');
    if (!ivHex || !encryptedHex) return text;
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
  } catch(e) {
    return text; // Se não conseguir descriptografar, retorna original
  }
}

module.exports = { encrypt, decrypt };
