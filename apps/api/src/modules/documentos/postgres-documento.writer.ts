import type { Transaction } from 'kysely';
import type { DB, JsonObject } from '../../db/schema.generated.ts';
import type { CreateDocumentoInput } from './documento.reader.ts';
import type { DocumentoWriter } from './documento.writer.ts';

export class PostgresDocumentoWriter implements DocumentoWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  async create(input: CreateDocumentoInput): Promise<{ id: string }> {
    const row = await this.#trx
      .insertInto('documento')
      .values({
        proyecto_id: input.proyectoId,
        propuesta_id: input.propuestaId ?? null,
        proveedor_id: input.proveedorId ?? null,
        nombre: input.nombre,
        mime: input.mime,
        tamano_bytes: String(input.bytes.byteLength),
        contenido: input.bytes,
        metadata: (input.metadata ?? {}) as JsonObject,
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
