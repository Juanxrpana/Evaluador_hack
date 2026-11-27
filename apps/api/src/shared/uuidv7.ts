/**
 * RFC 9562 UUID version 7: 48-bit millisecond Unix timestamp, version 7,
 * variant 10, 62 random bits. Time-ordered ids make B-tree indexes friendly.
 *
 * Used by Better Auth (browser-side ids are generated on the server for
 * users, sessions, accounts, and verifications). Database-side defaults use
 * PostgreSQL 18+'s native `uuidv7()`.
 */
export function uuidv7(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const timestamp = Date.now();

  bytes[0] = (timestamp / 2 ** 40) & 255;
  bytes[1] = (timestamp / 2 ** 32) & 255;
  bytes[2] = (timestamp / 2 ** 24) & 255;
  bytes[3] = (timestamp / 2 ** 16) & 255;
  bytes[4] = (timestamp / 2 ** 8) & 255;
  bytes[5] = timestamp & 255;
  bytes[6] = (bytes[6] & 15) | 0x70;
  bytes[8] = (bytes[8] & 63) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
