import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export type EncryptedSecret =
  | { encrypted: true; iv: string; authTag: string; data: string }
  | { encrypted: false; data: string };

function getKey(): Buffer | null {
  const hex = process.env.BRIDGE_TOKEN_ENCRYPTION_KEY;
  if (!hex) return null;
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('BRIDGE_TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)');
  }
  return key;
}

/** Encrypts with AES-256-GCM when BRIDGE_TOKEN_ENCRYPTION_KEY is set, otherwise stores as plaintext. */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getKey();
  if (!key) {
    console.warn(
      'BRIDGE_TOKEN_ENCRYPTION_KEY not set — storing the Bridge access token in plaintext in the ' +
        'locked-down `bridgeAccounts` collection. Set the key to encrypt it at rest.',
    );
    return { encrypted: false, data: plaintext };
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encrypted: true,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    data: data.toString('hex'),
  };
}

export function decryptSecret(payload: EncryptedSecret): string {
  if (!payload.encrypted) return payload.data;

  const key = getKey();
  if (!key) {
    throw new Error('BRIDGE_TOKEN_ENCRYPTION_KEY is required to decrypt a previously encrypted Bridge token.');
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
  const data = Buffer.concat([decipher.update(Buffer.from(payload.data, 'hex')), decipher.final()]);
  return data.toString('utf8');
}
