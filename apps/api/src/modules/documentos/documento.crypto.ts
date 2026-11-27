import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Storage format marker written into documento.metadata.enc. */
export const DOCUMENTO_ENC_ALGORITMO = 'aes-256-gcm' as const;

// AES-GCM standard parameters: 96-bit IV and a 128-bit authentication tag.
const IV_BYTES = 12;
const TAG_BYTES = 16;

export interface ContenidoCifrado {
  /** IV ‖ authTag ‖ ciphertext, ready for the bytea column. */
  bytes: Buffer;
  algoritmo: string;
}

/**
 * At-rest encryption port for documento.contenido. The storage layer owns
 * it: services keep handling plaintext bytes in memory and never learn about
 * the cipher. `descifrar` is the ONLY sanctioned way to read the column back.
 */
export interface DocumentoCrypto {
  cifrar(bytes: Buffer): ContenidoCifrado;
  descifrar(bytes: Buffer): Buffer;
}

export class ClaveDeCifradoInvalidaError extends Error {
  constructor(recibidos: number) {
    super(`AES-256 needs a 32-byte key, received ${recibidos}`);
    this.name = 'ClaveDeCifradoInvalidaError';
  }
}

/** Ciphertext is tampered, truncated, or was written with a different key. */
export class ContenidoCorruptoError extends Error {
  constructor(recibidos: number) {
    super(`Encrypted document content is corrupt or uses another key (${recibidos} bytes)`);
    this.name = 'ContenidoCorruptoError';
  }
}

/**
 * AES-256-GCM adapter over Node's crypto. GCM adds authenticated encryption:
 * a modified row fails verification instead of silently returning garbage.
 * Every cifrar() call draws a fresh IV, so identical uploads never share
 * ciphertext.
 */
export class Aes256GcmDocumentoCrypto implements DocumentoCrypto {
  readonly #key: Buffer;

  constructor(key: Buffer) {
    if (key.byteLength !== 32) {
      throw new ClaveDeCifradoInvalidaError(key.byteLength);
    }

    this.#key = key;
  }

  cifrar(bytes: Buffer): ContenidoCifrado {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(DOCUMENTO_ENC_ALGORITMO, this.#key, iv);
    const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      bytes: Buffer.concat([iv, authTag, ciphertext]),
      algoritmo: DOCUMENTO_ENC_ALGORITMO,
    };
  }

  descifrar(bytes: Buffer): Buffer {
    if (bytes.byteLength < IV_BYTES + TAG_BYTES) {
      throw new ContenidoCorruptoError(bytes.byteLength);
    }

    const iv = bytes.subarray(0, IV_BYTES);
    const authTag = bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = bytes.subarray(IV_BYTES + TAG_BYTES);

    try {
      const decipher = createDecipheriv(DOCUMENTO_ENC_ALGORITMO, this.#key, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
      throw new ContenidoCorruptoError(bytes.byteLength);
    }
  }
}
