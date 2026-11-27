import type { Transaction } from 'kysely';
import type { DB, JsonObject } from '../../db/schema.generated.ts';
import type { CreateDocumentoInput } from './documento.reader.ts';
import type { DocumentoCrypto } from './documento.crypto.ts';
import type { DocumentoWriter } from './documento.writer.ts';

export class PostgresDocumentoWriter implements DocumentoWriter {
  readonly #trx: Transaction<DB>;
  readonly #crypto: DocumentoCrypto;

  constructor(trx: Transaction<DB>, crypto: DocumentoCrypto) {
    this.#trx = trx;
    this.#crypto = crypto;
  }

  async create(input: CreateDocumentoInput): Promise<{ id: string }> {
    // At-rest encryption lives in the storage adapter: every caller writes
    // plaintext in memory and the database only ever sees ciphertext.
    // tamano_bytes keeps reporting the original file size to users.
    const cifrado = this.#crypto.cifrar(input.bytes);

    const row = await this.#trx
      .insertInto('documento')
      .values({
        proyecto_id: input.proyectoId,
        propuesta_id: input.propuestaId ?? null,
        proveedor_id: input.proveedorId ?? null,
        nombre: input.nombre,
        mime: input.mime,
        tamano_bytes: String(input.bytes.byteLength),
        contenido: cifrado.bytes,
        metadata: { ...input.metadata, enc: cifrado.algoritmo } as JsonObject,
      })
      .returning(['id', 'created_at'])
      .executeTakeFirstOrThrow();

    return { id: row.id };
  }

  async remove(id: string): Promise<boolean> {
    const rows = await this.#trx
      .deleteFrom('documento')
      .where('id', '=', id)
      .returning(['id'])
      .execute();

    return rows.length > 0;
  }
}
