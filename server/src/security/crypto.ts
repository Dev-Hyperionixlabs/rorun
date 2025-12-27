import * as crypto from 'crypto';

function getKey(): Buffer {
  const keyB64 = process.env.DATA_ENCRYPTION_KEY;
  if (!keyB64) {
    throw new Error('DATA_ENCRYPTION_KEY is not set');
  }
  const key = Buffer.from(keyB64, 'base64');
  if (key.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes base64 (AES-256-GCM)');
  }
  return key;
}

export function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const key = getKey();
  const iv = crypto.randomBytes(12); // recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // store ciphertext+tag together, base64-encoded, to keep schema minimal
  const ciphertext = Buffer.concat([enc, tag]).toString('base64');
  return { ciphertext, iv: iv.toString('base64') };
}

export function decrypt(ciphertext: string, iv: string): string {
  const key = getKey();
  const ivBuf = Buffer.from(iv, 'base64');
  const data = Buffer.from(ciphertext, 'base64');
  if (data.length < 17) {
    throw new Error('Ciphertext too short');
  }
  const tag = data.subarray(data.length - 16);
  const enc = data.subarray(0, data.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}


