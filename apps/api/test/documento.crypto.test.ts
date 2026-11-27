import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMigrator } from '../src/db/migrator.ts';
import { createTransactionRunner } from '../src/db/transaction.ts';
import {
  Aes256GcmDocumentoCrypto,
  ClaveDeCifradoInvalidaError,
  ContenidoCorruptoError,
  DOCUMENTO_ENC_ALGORITMO,
} from '../src/modules/documentos/documento.crypto.ts';
import { PostgresDocumentoWriter } from '../src/modules/documentos/postgres-documento.writer.ts';
import { createTestDatabase, type TestDatabase } from './support/test-database.ts';

const documentoCrypto = new Aes256GcmDocumentoCrypto(Buffer.alloc(32, 0x5a));

let testDb: TestDatabase;
let proyectoId: string;
let runInTransaction: ReturnType<
  typeof createTransactionRunner<{ documentos: PostgresDocumentoWriter }>
>;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const result = await createMigrator(testDb.db).migrateToLatest();

  if (result.error) {
    throw result.error;
  }

  const proyecto = await testDb.db
    .insertInto('proyecto')
    .values({ nombre: 'Proyecto cifrado' })
    .returning(['id'])
    .executeTakeFirstOrThrow();

  proyectoId = proyecto.id;
  runInTransaction = createTransactionRunner(testDb.db, (trx) => ({
    documentos: new PostgresDocumentoWriter(trx, documentoCrypto),
  }));
});

afterAll(async () => {
  await testDb.destroy();
});

describe('Aes256GcmDocumentoCrypto', () => {
  const claro = Buffer.from('%PDF-1.4 presupuesto confidencial de prueba');

  it('round-trips plaintext through cifrar/descifrar', () => {
    const cifrado = documentoCrypto.cifrar(claro);

    expect(documentoCrypto.descifrar(cifrado.bytes).equals(claro)).toBe(true);
  });

  it('never stores plaintext and draws a fresh IV per call', () => {
    const primero = documentoCrypto.cifrar(claro);
    const segundo = documentoCrypto.cifrar(claro);

    expect(primero.bytes.equals(claro)).toBe(false);
    expect(primero.bytes.equals(segundo.bytes)).toBe(false);
    expect(primero.bytes.byteLength).toBe(claro.byteLength + 12 + 16);
  });

  it('detects tampered ciphertext', () => {
    const cifrado = documentoCrypto.cifrar(claro);
    cifrado.bytes[cifrado.bytes.byteLength - 1] ^= 0xff;

    expect(() => documentoCrypto.descifrar(cifrado.bytes)).toThrow(ContenidoCorruptoError);
  });

  it('rejects ciphertext written with another key', () => {
    const otraClave = new Aes256GcmDocumentoCrypto(Buffer.alloc(32, 0x11));
    const cifrado = otraClave.cifrar(claro);

    expect(() => documentoCrypto.descifrar(cifrado.bytes)).toThrow(ContenidoCorruptoError);
  });

  it('rejects truncated payloads', () => {
    expect(() => documentoCrypto.descifrar(claro.subarray(0, 8))).toThrow(ContenidoCorruptoError);
  });

  it('rejects keys that are not exactly 32 bytes', () => {
    expect(() => new Aes256GcmDocumentoCrypto(Buffer.alloc(31))).toThrow(
      ClaveDeCifradoInvalidaError,
    );
    expect(() => new Aes256GcmDocumentoCrypto(Buffer.alloc(33))).toThrow(
      ClaveDeCifradoInvalidaError,
    );
  });
});

describe('PostgresDocumentoWriter at rest', () => {
  it('stores ciphertext, the algorithm marker, and the original size', async () => {
    const claro = Buffer.from('%PDF-1.4 oferta economica confidencial');

    const documentoId = await runInTransaction(async ({ documentos }) => {
      const { id } = await documentos.create({
        proyectoId,
        propuestaId: null,
        proveedorId: null,
        nombre: 'Propuesta_101_Alfa_CA.pdf',
        mime: 'application/pdf',
        bytes: claro,
      });

      return id;
    });

    const row = await testDb.db
      .selectFrom('documento')
      .select(['contenido', 'tamano_bytes', 'metadata'])
      .where('id', '=', documentoId)
      .executeTakeFirstOrThrow();

    // PGlite returns bytea as a plain Uint8Array; normalize to Buffer so both
    // the in-memory harness and the real pg driver share one code path.
    const contenido = Buffer.from(row.contenido);
    const metadata = row.metadata as { enc?: unknown };

    expect(contenido.equals(claro)).toBe(false);
    expect(contenido.includes(claro)).toBe(false);
    expect(contenido.byteLength).toBe(claro.byteLength + 12 + 16);
    expect(String(row.tamano_bytes)).toBe(String(claro.byteLength));
    expect(metadata.enc).toBe(DOCUMENTO_ENC_ALGORITMO);
    expect(documentoCrypto.descifrar(contenido).equals(claro)).toBe(true);
  });
});
