import type { Transaction } from 'kysely';
import { sql } from 'kysely';
import type { DB } from '../../db/schema.generated.ts';
import { toPgVectorText } from '../ai/embedding.client.ts';
import type { ConocimientoInsercion, ConocimientoWriter } from './conocimiento.writer.ts';

/**
 * Write adapter for knowledge chunks. The embedding column is not part of
 * the generated Kysely types (PGlite test databases skip pgvector), so
 * inserts use one raw statement per chunk: vectors are passed as pgvector
 * text literals cast with `::vector`.
 */
export class PostgresConocimientoWriter implements ConocimientoWriter {
  readonly #trx: Transaction<DB>;

  constructor(trx: Transaction<DB>) {
    this.#trx = trx;
  }

  async insertConEmbeddings(insercion: ConocimientoInsercion): Promise<number> {
    if (insercion.chunks.length !== insercion.embeddings.length) {
      throw new Error('Chunks and embeddings must have the same length');
    }

    // A Kysely transaction runs on a single connection; the pg driver queues
    // these statements in order, and chunk positions are explicit.
    await Promise.all(
      insercion.chunks.map((chunk, position) => {
        const vector = toPgVectorText(insercion.embeddings[position]);
        const metadata = { ...insercion.metadata };

        return sql`
          insert into conocimiento
            (proyecto_id, titulo, contenido, metadata, tipo, chunk_index, documento_id, embedding)
          values
            (${insercion.proyectoId}::uuid,
             ${insercion.titulo},
             ${chunk.text},
             ${JSON.stringify(metadata)}::jsonb,
             ${insercion.tipo},
             ${chunk.index},
             ${insercion.documentoId ?? null}::uuid,
             ${vector}::vector)
        `.execute(this.#trx);
      }),
    );

    return insercion.chunks.length;
  }

  async deleteProveedorHistorial(proyectoId: string, proveedorId: string): Promise<void> {
    await sql`
      delete from conocimiento
      where proyecto_id = ${proyectoId}::uuid
        and tipo = 'proveedor_historial'
        and metadata->>'proveedorId' = ${proveedorId}
    `.execute(this.#trx);
  }
}
